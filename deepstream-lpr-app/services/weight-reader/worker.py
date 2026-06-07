#!/usr/bin/env python3
import argparse
import json
import os
import re
import socket
import sys
import time
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
import requests


def load_payload():
    path = os.environ.get("SERVICE_CONFIG_PATH")
    if not path:
        raise RuntimeError("SERVICE_CONFIG_PATH is not set.")
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def safe_name(value):
    text = str(value or "item").strip().lower()
    text = re.sub(r"[^a-z0-9_.-]+", "-", text)
    return text.strip("-") or "item"


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def output_dir(payload):
    directory = Path(os.environ.get("SERVICE_OUTPUT_DIR") or payload.get("outputDir") or os.getcwd())
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def configured_camera(payload, camera_id):
    for camera in (payload.get("appConfig") or {}).get("streams") or []:
        if str(camera.get("id") or "") == str(camera_id or ""):
            return camera
    return None


def resolve_source(payload):
    config = payload.get("config") or {}
    selected_camera_id = str(config.get("selectedCameraId") or "").strip()
    source_mode = str(config.get("sourceMode") or "configured").strip()
    camera = configured_camera(payload, selected_camera_id) if source_mode == "configured" or selected_camera_id else None
    if camera:
        return str(camera.get("rtspUrl") or "").strip(), camera
    return str(config.get("cameraUrl") or "").strip(), None


def zone_by_id(camera, zone_id):
    for zone in (camera or {}).get("zones") or []:
        if str(zone.get("id") or "") == str(zone_id or ""):
            return zone
    return None


def clamp(value, low, high):
    return max(low, min(high, int(round(float(value)))))


def crop_rect_from_polygon(polygon, width, height):
    points = [point for point in polygon or [] if isinstance(point, list) and len(point) >= 2]
    if not points:
        return None
    xs = [float(point[0]) for point in points]
    ys = [float(point[1]) for point in points]
    return [
        clamp(min(xs), 0, width - 1),
        clamp(max(xs), 1, width),
        clamp(min(ys), 0, height - 1),
        clamp(max(ys), 1, height),
    ]


def scale_polygon_to_frame(zone, width, height):
    polygon = (zone or {}).get("polygon") or []
    reference = (zone or {}).get("referenceSize") or {}
    ref_width = float(reference.get("width") or 0)
    ref_height = float(reference.get("height") or 0)
    if not polygon or ref_width <= 0 or ref_height <= 0:
        return polygon, False
    if abs(ref_width - width) < 1 and abs(ref_height - height) < 1:
        return polygon, False
    scale_x = width / ref_width
    scale_y = height / ref_height
    return [[float(point[0]) * scale_x, float(point[1]) * scale_y] for point in polygon if isinstance(point, list) and len(point) >= 2], True


def crop_rect(payload, camera, frame):
    config = payload.get("config") or {}
    height, width = frame.shape[:2]
    mode = str(config.get("cropMode") or "zone").strip()
    if mode == "full":
        return [0, width, 0, height], {"mode": "full"}
    if mode == "zone":
        zone = zone_by_id(camera, config.get("cropZoneId"))
        polygon, scaled = scale_polygon_to_frame(zone, width, height)
        rect = crop_rect_from_polygon(polygon, width, height)
        if rect:
            return rect, {"mode": "zone", "zoneId": zone.get("id"), "zoneName": zone.get("name"), "scaledFromReference": scaled}
    manual = config.get("manualCrop") or []
    if isinstance(manual, list) and len(manual) >= 4:
        rect = [
            clamp(manual[0], 0, width - 1),
            clamp(manual[1], 1, width),
            clamp(manual[2], 0, height - 1),
            clamp(manual[3], 1, height),
        ]
        return rect, {"mode": "manual"}
    return [0, width, 0, height], {"mode": "fallback_full"}


def crop_frame(frame, rect):
    x_min, x_max, y_min, y_max = rect
    if x_max <= x_min or y_max <= y_min:
        raise RuntimeError(f"Invalid crop rectangle: {rect}")
    return frame[y_min:y_max, x_min:x_max]


def open_capture(source, transport="tcp", timeout_sec=15):
    if not source:
        raise RuntimeError("Scale camera source is required.")
    if source.startswith("rtsp://") or source.startswith("rtsps://"):
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = f"rtsp_transport;{transport or 'tcp'}"
    cap = cv2.VideoCapture(source)
    if hasattr(cv2, "CAP_PROP_OPEN_TIMEOUT_MSEC"):
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, max(3, int(timeout_sec or 15)) * 1000)
    if hasattr(cv2, "CAP_PROP_READ_TIMEOUT_MSEC"):
        cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, max(3, int(timeout_sec or 15)) * 1000)
    if not cap.isOpened():
        raise RuntimeError(f"OpenCV could not open scale camera: {source}")
    return cap


def preprocess_image(image, image_size, mode="letterbox"):
    height, width = image.shape[:2]
    if mode == "resize":
        resized = cv2.resize(image, (image_size, image_size), interpolation=cv2.INTER_LINEAR)
        meta = {"mode": "resize", "gain": None, "padX": 0.0, "padY": 0.0, "inputSize": image_size}
    else:
        gain = min(image_size / max(width, 1), image_size / max(height, 1))
        new_width = int(round(width * gain))
        new_height = int(round(height * gain))
        resized_inner = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_LINEAR)
        pad_x = (image_size - new_width) / 2.0
        pad_y = (image_size - new_height) / 2.0
        left = int(round(pad_x - 0.1))
        right = int(round(pad_x + 0.1))
        top = int(round(pad_y - 0.1))
        bottom = int(round(pad_y + 0.1))
        resized = cv2.copyMakeBorder(resized_inner, top, bottom, left, right, cv2.BORDER_CONSTANT, value=(114, 114, 114))
        meta = {"mode": "letterbox", "gain": gain, "padX": float(left), "padY": float(top), "inputSize": image_size}
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    return np.transpose(rgb, (2, 0, 1))[None, ...], meta


def triton_infer(config, crop):
    infer_url = str(config.get("tritonInferUrl") or "").strip()
    if not infer_url:
        raise RuntimeError("Triton infer URL is required for triton_yolo mode.")
    image_size = int(config.get("imageSize") or 640)
    input_name = str(config.get("tritonInputName") or "images")
    preprocess_mode = str(config.get("preprocessMode") or "letterbox").strip()
    tensor, meta = preprocess_image(crop, image_size, preprocess_mode)
    body = {
        "inputs": [{
            "name": input_name,
            "shape": list(tensor.shape),
            "datatype": "FP32",
            "data": tensor.reshape(-1).tolist()
        }]
    }
    response = requests.post(infer_url, json=body, timeout=max(10, int(config.get("inferTimeoutSec") or 30)))
    response.raise_for_status()
    data = response.json()
    data["_preprocess"] = meta
    return data


def output_array(triton_output):
    outputs = triton_output.get("outputs") or []
    if not outputs:
        raise RuntimeError("Triton response has no outputs.")
    arrays = []
    for output in outputs:
        shape = output.get("shape") or []
        data = output.get("data")
        if data is None:
            raise RuntimeError("Triton JSON output does not include data. Use JSON response mode for this service.")
        arrays.append((output.get("name") or "", np.asarray(data, dtype=np.float32).reshape(shape)))
    return arrays


def decode_yolo_outputs(triton_output, labels, conf_threshold, crop_shape, image_size):
    arrays = output_array(triton_output)
    preprocess_meta = triton_output.get("_preprocess") or {"mode": "resize"}
    detections = []
    if len(arrays) >= 3 and all(arr[1].ndim >= 2 for arr in arrays[:3]):
        boxes = arrays[0][1][0] if arrays[0][1].ndim == 3 else arrays[0][1]
        scores = arrays[1][1][0].reshape(-1)
        classes = arrays[2][1][0].reshape(-1)
        for box, score, cls in zip(boxes, scores, classes):
            if float(score) < conf_threshold:
                continue
            x1, y1, x2, y2 = box[:4]
            detections.append(scale_detection([x1, y1, x2, y2], int(cls), float(score), labels, crop_shape, image_size, xyxy=True, preprocess_meta=preprocess_meta))
        return [item for item in detections if item]

    raw = arrays[0][1]
    pred = raw[0] if raw.ndim == 3 else raw
    if pred.shape[0] < pred.shape[1] and pred.shape[0] <= len(labels) + 8:
        pred = pred.T
    for row in pred:
        if row.shape[0] < 5:
            continue
        box = row[:4]
        scores = row[4:4 + len(labels)]
        if scores.size == 0:
            continue
        cls = int(np.argmax(scores))
        score = float(scores[cls])
        if score < conf_threshold:
            continue
        detections.append(scale_detection(box, cls, score, labels, crop_shape, image_size, xyxy=False, preprocess_meta=preprocess_meta))
    return [item for item in detections if item]


def scale_detection(box, cls, score, labels, crop_shape, image_size, xyxy=False, preprocess_meta=None):
    label = labels[cls] if 0 <= cls < len(labels) else str(cls)
    crop_h, crop_w = crop_shape[:2]
    if xyxy:
        x1, y1, x2, y2 = [float(v) for v in box]
    else:
        cx, cy, w, h = [float(v) for v in box]
        x1, y1, x2, y2 = cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2
    preprocess_meta = preprocess_meta or {"mode": "resize"}
    if preprocess_meta.get("mode") == "letterbox":
        gain = float(preprocess_meta.get("gain") or 1.0)
        pad_x = float(preprocess_meta.get("padX") or 0.0)
        pad_y = float(preprocess_meta.get("padY") or 0.0)
        x1 = (x1 - pad_x) / gain
        x2 = (x2 - pad_x) / gain
        y1 = (y1 - pad_y) / gain
        y2 = (y2 - pad_y) / gain
    else:
        scale_x = crop_w / float(image_size)
        scale_y = crop_h / float(image_size)
        x1 *= scale_x
        x2 *= scale_x
        y1 *= scale_y
        y2 *= scale_y
    x1 = max(0.0, min(float(crop_w), x1))
    x2 = max(0.0, min(float(crop_w), x2))
    y1 = max(0.0, min(float(crop_h), y1))
    y2 = max(0.0, min(float(crop_h), y2))
    return {
        "x1": x1,
        "y1": y1,
        "x2": x2,
        "y2": y2,
        "label": str(label),
        "classId": cls,
        "confidence": score
    }


def iou(a, b):
    x1 = max(a["x1"], b["x1"])
    y1 = max(a["y1"], b["y1"])
    x2 = min(a["x2"], b["x2"])
    y2 = min(a["y2"], b["y2"])
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    area_a = max(0, a["x2"] - a["x1"]) * max(0, a["y2"] - a["y1"])
    area_b = max(0, b["x2"] - b["x1"]) * max(0, b["y2"] - b["y1"])
    union = area_a + area_b - inter
    return 0 if union <= 0 else inter / union


def filter_digits(detections, iou_threshold):
    detections = sorted(detections, key=lambda item: item["confidence"], reverse=True)
    kept = []
    while detections:
        best = detections.pop(0)
        if str(best["label"]).isdigit():
            kept.append(best)
        detections = [item for item in detections if iou(best, item) < iou_threshold]
    return sorted(kept, key=lambda item: item["x1"])


def read_digits(payload, crop):
    config = payload.get("config") or {}
    labels = config.get("labels") if isinstance(config.get("labels"), list) else list("0123456789")
    conf = float(config.get("confidenceThreshold") or 0.5)
    iou_threshold = float(config.get("iouThreshold") or 0.5)
    mode = str(config.get("inferenceMode") or "triton_yolo")
    if mode == "mock":
        return {"text": "0", "number": 0, "detections": [], "rawDetections": []}
    triton_output = triton_infer(config, crop)
    raw = decode_yolo_outputs(triton_output, labels, conf, crop.shape, int(config.get("imageSize") or 640))
    digits = filter_digits(raw, iou_threshold)
    text = "".join(item["label"] for item in digits)
    if not text:
        return {"text": "", "number": None, "detections": digits, "rawDetections": raw}
    number = int(text)
    divide_above = float(config.get("divideAbove") or 0)
    divide_by = float(config.get("divideBy") or 1)
    if divide_above > 0 and number > divide_above and divide_by > 1:
        number = number / divide_by
    return {"text": text, "number": number, "detections": digits, "rawDetections": raw}


def choose_result(samples, peak_sample, early_stopped, strategy):
    valid = [item for item in samples if item.get("number") is not None]
    if not valid:
        return None, "no_valid_digits"
    if strategy == "peak" and peak_sample:
        return peak_sample, "peak"
    if strategy == "hybrid" and early_stopped and peak_sample:
        return peak_sample, "peak_before_drop"
    by_number = defaultdict(list)
    for item in valid:
        by_number[str(item["number"])].append(item)
    best_number = sorted(by_number.items(), key=lambda kv: (len(kv[1]), kv[1][-1]["index"]), reverse=True)[0][0]
    return by_number[best_number][-1], "most_frequent"


def save_image(directory, prefix, image):
    name = f"{datetime.now(timezone.utc).isoformat().replace(':', '-').replace('.', '-')}_{safe_name(prefix)}.jpg"
    path = directory / name
    if not cv2.imwrite(str(path), image):
        raise RuntimeError(f"Could not write image: {path}")
    return path


def read_weight(payload, event=None):
    config = payload.get("config") or {}
    source, camera = resolve_source(payload)
    cap = open_capture(source, config.get("rtspTransport") or "tcp", config.get("timeoutSec") or 15)
    start = time.time()
    max_seconds = float(config.get("maxReadSeconds") or 60)
    drop_threshold = float(config.get("dropThreshold") or 3000)
    max_drop_count = int(config.get("maxDropCount") or 70)
    strategy = str(config.get("selectionStrategy") or "hybrid")
    out_dir = output_dir(payload)
    samples = []
    peak_sample = None
    peak_number = float("-inf")
    drops = 0
    early_stopped = False
    last_crop = None
    crop_meta = {}
    try:
        while time.time() - start <= max_seconds:
            ok, frame = cap.read()
            if not ok or frame is None:
                time.sleep(0.05)
                continue
            rect, crop_meta = crop_rect(payload, camera, frame)
            crop = crop_frame(frame, rect)
            last_crop = crop
            result = read_digits(payload, crop)
            if result.get("number") is None:
                continue
            sample = {
                "index": len(samples),
                "number": result["number"],
                "text": result["text"],
                "detections": result.get("detections") or [],
                "capturedAt": now_iso(),
                "crop": crop.copy()
            }
            samples.append(sample)
            number = float(result["number"])
            if number > peak_number:
                peak_number = number
                peak_sample = sample
                drops = 0
            elif peak_number - number > drop_threshold:
                drops += 1
            else:
                drops = 0
            if drops >= max_drop_count:
                early_stopped = True
                break
    finally:
        cap.release()

    selected, method = choose_result(samples, peak_sample, early_stopped, strategy)
    if not selected:
        selected_crop = last_crop if last_crop is not None else np.zeros((64, 256, 3), dtype=np.uint8)
        image_path = save_image(out_dir, "weight-no-result", selected_crop)
        weight = None
        text = ""
    else:
        image_path = save_image(out_dir, "weight", selected["crop"])
        weight = selected["number"]
        text = selected["text"]

    processed_at = now_iso()
    result = {
        "ok": selected is not None,
        "event": event or {},
        "weight": weight,
        "text": text,
        "analysisImage": str(image_path),
        "analysisImageName": image_path.name,
        "analysisCode": config.get("analysisCode") or "",
        "analysisCamId": config.get("analysisCamId") or "",
        "cameraId": (camera or {}).get("id") or config.get("selectedCameraId") or "",
        "cameraName": (camera or {}).get("name") or "",
        "crop": crop_meta,
        "selectionMethod": method,
        "framesRead": len(samples),
        "earlyStopped": early_stopped,
        "processedAt": processed_at
    }
    result["payload"] = render_schema(config.get("outputSchema"), event or {}, result)
    append_jsonl(out_dir / "events.jsonl", result)
    return result


def append_jsonl(path, item):
    with open(path, "a", encoding="utf-8") as handle:
        handle.write(json.dumps(item, ensure_ascii=False) + "\n")


def nested_get(data, dotted):
    current = data
    for part in str(dotted or "").split("."):
        if not part:
            continue
        if isinstance(current, dict):
            current = current.get(part)
        else:
            return ""
    return current if current is not None else ""


def render_string(template, event, service):
    text = str(template)
    values = {
        "uuid": str(uuid.uuid4()),
        "blank": "",
        "service.weight": service.get("weight"),
        "service.text": service.get("text"),
        "service.analysisImage": service.get("analysisImage"),
        "service.analysisImageName": service.get("analysisImageName"),
        "service.analysisCode": service.get("analysisCode"),
        "service.analysisCamId": service.get("analysisCamId"),
        "service.cameraId": service.get("cameraId"),
        "service.cameraName": service.get("cameraName"),
        "service.processedAt": service.get("processedAt"),
        "service.selectionMethod": service.get("selectionMethod"),
    }

    def replace(match):
        key = match.group(1).strip()
        if key in values:
            return "" if values[key] is None else str(values[key])
        if key.startswith("event."):
            return str(nested_get(event, key[6:]))
        return match.group(0)

    return re.sub(r"\{\{\s*([^}]+)\s*\}\}", replace, text)


def render_schema(schema, event, service):
    if schema is None or schema == "":
        schema = {
            "id": "{{uuid}}",
            "weight": "{{service.weight}}",
            "weight_image": "{{service.analysisImage}}",
            "processed_at": "{{service.processedAt}}"
        }
    if isinstance(schema, dict):
        return {key: render_schema(value, event, service) for key, value in schema.items()}
    if isinstance(schema, list):
        return [render_schema(item, event, service) for item in schema]
    if isinstance(schema, str):
        rendered = render_string(schema, event, service)
        if rendered == "":
            return ""
        if rendered.replace(".", "", 1).isdigit():
            return float(rendered) if "." in rendered else int(rendered)
        return rendered
    return schema


def redis_encode(args):
    chunks = [f"*{len(args)}\r\n".encode("ascii")]
    for arg in args:
        data = str(arg).encode("utf-8")
        chunks.append(f"${len(data)}\r\n".encode("ascii") + data + b"\r\n")
    return b"".join(chunks)


def redis_command(provider, *args, timeout=8):
    host = provider.get("host") or "127.0.0.1"
    port = int(provider.get("port") or 6379)
    with socket.create_connection((host, port), timeout=timeout) as sock:
        sock.sendall(redis_encode(args))
        return sock.recv(1024 * 1024)


def redis_provider(payload):
    return ((payload.get("connections") or {}).get("providers") or {}).get("redis") or {}


def channel_by_id(payload, channel_id):
    for channel in (payload.get("connections") or {}).get("channels") or []:
        if channel.get("id") == channel_id:
            return channel
    return None


def service_instance_dir():
    return Path(os.environ.get("SERVICE_INSTANCE_DIR") or os.getcwd())


def stream_cursor_path(channel_name):
    return service_instance_dir() / f"redis-stream-{safe_name(channel_name)}.cursor"


def read_cursor(channel_name):
    try:
        value = stream_cursor_path(channel_name).read_text(encoding="utf-8").strip()
        return value or "$"
    except FileNotFoundError:
        return "$"


def write_cursor(channel_name, last_id):
    path = stream_cursor_path(channel_name)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(str(last_id), encoding="utf-8")


def parse_redis_stream_payload(text):
    ids = re.findall(r"\$([0-9]+)\r\n([0-9]+-[0-9]+)", text)
    last_id = ids[-1][1] if ids else ""
    bulk_values = []
    index = 0
    while True:
        marker = text.find("$", index)
        if marker < 0:
            break
        line_end = text.find("\r\n", marker)
        if line_end < 0:
            break
        try:
            length = int(text[marker + 1:line_end])
        except ValueError:
            index = marker + 1
            continue
        start = line_end + 2
        end = start + length
        if end > len(text):
            break
        bulk_values.append(text[start:end])
        index = end + 2
    event = {}
    for candidate in reversed(bulk_values):
        candidate = str(candidate or "").strip()
        if not candidate.startswith("{"):
            continue
        try:
            event = json.loads(candidate)
            break
        except Exception:
            continue
    return last_id, event


def publish_result(payload, result):
    bindings = payload.get("bindings") or {}
    if not bindings.get("enabled"):
        return
    channel = channel_by_id(payload, bindings.get("outputChannelId"))
    if not channel:
        return
    data = json.dumps(result.get("payload") or result, ensure_ascii=False)
    if channel.get("provider") == "redis":
        provider = redis_provider(payload)
        if channel.get("type") == "stream" or bindings.get("outputMode") == "produce":
            redis_command(provider, "XADD", channel.get("name"), "*", "payload", data)
        else:
            redis_command(provider, "PUBLISH", channel.get("name"), data)
    elif channel.get("provider") == "kafka":
        from kafka import KafkaProducer
        provider = ((payload.get("connections") or {}).get("providers") or {}).get("kafka") or {}
        producer = KafkaProducer(
            bootstrap_servers=f"{provider.get('host') or '127.0.0.1'}:{int(provider.get('port') or 9092)}",
            value_serializer=lambda value: json.dumps(value, ensure_ascii=False).encode("utf-8"),
        )
        producer.send(channel.get("name"), value=result.get("payload") or result)
        producer.flush()
        producer.close()


def run_once(payload):
    sample_event = (payload.get("request") or {}).get("event") or {"eventId": str(uuid.uuid4()), "source": "manual-test"}
    result = read_weight(payload, sample_event)
    publish_result(payload, result)
    print(json.dumps(result, ensure_ascii=False), flush=True)


def run_loop(payload):
    bindings = payload.get("bindings") or {}
    input_channel = channel_by_id(payload, bindings.get("inputChannelId"))
    if not input_channel:
        run_once(payload)
        return
    if input_channel.get("provider") != "redis":
        raise RuntimeError("Weight Reader loop currently supports Redis channels first. Use Redis Stream for production wiring.")
    provider = redis_provider(payload)
    channel_name = input_channel.get("name")
    last_id = read_cursor(channel_name)
    print(json.dumps({"ok": True, "mode": "redis_stream", "channel": channel_name, "lastId": last_id}, ensure_ascii=False), flush=True)
    while True:
        raw = redis_command(provider, "XREAD", "BLOCK", "5000", "COUNT", "1", "STREAMS", channel_name, last_id)
        text = raw.decode("utf-8", "replace")
        if not text.strip() or text.strip() in {"*-1", "*0", "$-1"}:
            continue
        next_id, event = parse_redis_stream_payload(text)
        if not next_id:
            continue
        try:
            result = read_weight(payload, event)
            publish_result(payload, result)
        except Exception as error:
            result = {"ok": False, "error": str(error), "event": event, "failedAt": now_iso()}
            append_jsonl(output_dir(payload) / "events.jsonl", result)
        write_cursor(channel_name, next_id)
        last_id = next_id
        print(json.dumps(result, ensure_ascii=False), flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--loop", action="store_true")
    args = parser.parse_args()
    payload = load_payload()
    if args.loop:
        run_loop(payload)
    else:
        run_once(payload)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
