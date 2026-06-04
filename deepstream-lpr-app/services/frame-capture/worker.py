#!/usr/bin/env python3
import argparse
import json
import os
import re
import socket
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


def load_payload():
    config_path = os.environ.get("SERVICE_CONFIG_PATH")
    if not config_path:
        raise RuntimeError("SERVICE_CONFIG_PATH is not set.")
    with open(config_path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def safe_name(value):
    text = str(value or "camera").strip().lower()
    text = re.sub(r"[^a-z0-9_.-]+", "-", text)
    return text.strip("-") or "camera"


def timestamp_name(camera_id):
    stamp = datetime.now(timezone.utc).isoformat().replace(":", "-").replace(".", "-")
    return f"{stamp}_{safe_name(camera_id)}.jpg"


def capture_with_cv2(source, output_path, transport="tcp", timeout_sec=15):
    import cv2

    if source.startswith("rtsp://") or source.startswith("rtsps://"):
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = f"rtsp_transport;{transport or 'tcp'}"
    cap = cv2.VideoCapture(source)
    if hasattr(cv2, "CAP_PROP_OPEN_TIMEOUT_MSEC"):
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, max(3, int(timeout_sec or 15)) * 1000)
    if hasattr(cv2, "CAP_PROP_READ_TIMEOUT_MSEC"):
        cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, max(3, int(timeout_sec or 15)) * 1000)
    if not cap.isOpened():
        raise RuntimeError("OpenCV could not open the camera source.")
    ok, frame = cap.read()
    cap.release()
    if not ok or frame is None:
        raise RuntimeError("OpenCV could not read a frame.")
    if not cv2.imwrite(str(output_path), frame):
        raise RuntimeError("OpenCV could not write output image.")


def capture_with_ffmpeg(source, output_path, transport, timeout_sec):
    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
    ]
    if source.startswith("rtsp://") or source.startswith("rtsps://"):
        command += ["-rtsp_transport", transport or "tcp"]
    command += ["-i", source, "-frames:v", "1", "-q:v", "2", str(output_path)]
    result = subprocess.run(command, capture_output=True, text=True, timeout=max(3, int(timeout_sec or 15)))
    if result.returncode != 0:
        raise RuntimeError((result.stderr or result.stdout or "ffmpeg capture failed.").strip())


def configured_camera(payload, camera_id):
    for camera in (payload.get("appConfig") or {}).get("streams") or []:
        if str(camera.get("id") or "") == str(camera_id or ""):
            return camera
    return None


def resolve_source(payload):
    config = payload.get("config") or {}
    source_mode = str(config.get("sourceMode") or "manual").strip()
    selected_camera_id = str(config.get("selectedCameraId") or "").strip()
    camera = configured_camera(payload, selected_camera_id) if source_mode == "configured" or selected_camera_id else None
    if camera:
        source = str(camera.get("rtspUrl") or "").strip()
        camera_id = config.get("cameraId") or camera.get("id") or payload.get("instanceId") or "camera"
        return source, camera_id, {
            "id": camera.get("id"),
            "name": camera.get("name"),
            "zones": camera.get("zones") or [],
            "roi": camera.get("roi") or {}
        }
    source = str(config.get("cameraUrl") or "").strip()
    camera_id = config.get("cameraId") or selected_camera_id or payload.get("instanceId") or "camera"
    return source, camera_id, None


def capture_once(payload):
    config = payload.get("config") or {}
    source, camera_id, camera_config = resolve_source(payload)
    if not source:
        raise RuntimeError("Camera source is required. Choose a Cameras & ROI camera or enter Manual camera URL.")
    output_dir = Path(config.get("outputDir") or os.environ.get("SERVICE_OUTPUT_DIR") or payload.get("outputDir") or os.getcwd())
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / timestamp_name(camera_id)
    timeout_sec = int(config.get("timeoutSec") or 15)
    transport = str(config.get("rtspTransport") or "tcp").lower()
    preferred_backend = str(config.get("captureBackend") or "ffmpeg").lower()

    if preferred_backend == "opencv":
        try:
            capture_with_cv2(source, output_path, transport, timeout_sec)
            backend = "opencv"
        except Exception as cv_error:
            try:
                capture_with_ffmpeg(source, output_path, transport, timeout_sec)
                backend = "ffmpeg"
            except Exception as ffmpeg_error:
                raise RuntimeError(f"Capture failed. OpenCV: {cv_error}. ffmpeg: {ffmpeg_error}") from ffmpeg_error
    else:
        try:
            capture_with_ffmpeg(source, output_path, transport, timeout_sec)
            backend = "ffmpeg"
        except Exception as ffmpeg_error:
            try:
                capture_with_cv2(source, output_path, transport, timeout_sec)
                backend = "opencv"
            except Exception as cv_error:
                raise RuntimeError(f"Capture failed. ffmpeg: {ffmpeg_error}. OpenCV: {cv_error}") from cv_error

    stat = output_path.stat()
    return {
        "ok": True,
        "backend": backend,
        "cameraId": camera_id,
        "cameraConfig": camera_config,
        "event": payload.get("event") or None,
        "path": str(output_path),
        "fileName": output_path.name,
        "size": stat.st_size,
        "capturedAt": datetime.now(timezone.utc).isoformat()
    }


def redis_command(host, port, *args, timeout=5):
    def encode(value):
        data = str(value).encode("utf-8")
        return b"$" + str(len(data)).encode("ascii") + b"\r\n" + data + b"\r\n"

    payload = b"*" + str(len(args)).encode("ascii") + b"\r\n" + b"".join(encode(arg) for arg in args)
    with socket.create_connection((host, int(port)), timeout=timeout) as sock:
        sock.sendall(payload)
        return sock.recv(1024 * 1024)


def redis_null_response(text):
    stripped = (text or "").strip()
    return stripped in {"*-1", "*0", "$-1"} or not stripped


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


def read_stream_cursor(channel_name, default="$"):
    path = stream_cursor_path(channel_name)
    try:
        value = path.read_text(encoding="utf-8").strip()
        return value or default
    except FileNotFoundError:
        return default


def write_stream_cursor(channel_name, last_id):
    if not last_id:
        return
    path = stream_cursor_path(channel_name)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(str(last_id), encoding="utf-8")


def publish_result(payload, result):
    bindings = payload.get("bindings") or {}
    if not bindings.get("enabled") or not bindings.get("outputChannelId"):
        return
    channel = channel_by_id(payload, bindings.get("outputChannelId"))
    if not channel or channel.get("provider") != "redis":
        return
    provider = redis_provider(payload)
    host = provider.get("host") or "127.0.0.1"
    port = provider.get("port") or 6379
    name = channel.get("name")
    data = json.dumps(result, ensure_ascii=False)
    if channel.get("type") == "stream" or bindings.get("outputMode") == "produce":
        redis_command(host, port, "XADD", name, "*", "payload", data)
    else:
        redis_command(host, port, "PUBLISH", name, data)


def run_loop_with_redis(payload):
    bindings = payload.get("bindings") or {}
    input_channel = channel_by_id(payload, bindings.get("inputChannelId"))
    if not bindings.get("enabled") or not input_channel or input_channel.get("provider") != "redis":
        return False
    provider = redis_provider(payload)
    host = provider.get("host") or "127.0.0.1"
    port = provider.get("port") or 6379
    channel_name = input_channel.get("name")
    if input_channel.get("type") == "stream" or bindings.get("inputMode") == "consume":
        last_id = read_stream_cursor(channel_name, "$")
        print(json.dumps({"ok": True, "mode": "redis_stream", "channel": channel_name, "lastId": last_id}, ensure_ascii=False), flush=True)
        while True:
            raw = redis_command(host, port, "XREAD", "BLOCK", "5000", "COUNT", "1", "STREAMS", channel_name, last_id, timeout=8)
            text = raw.decode("utf-8", "replace")
            if redis_null_response(text):
                continue
            # Minimal RESP parsing is intentionally avoided here; the captured frame is triggered by any message.
            ids = re.findall(r"\$([0-9]+)\r\n([0-9]+-[0-9]+)", text)
            next_id = ids[-1][1] if ids else last_id
            if ids:
                last_id = next_id
            try:
                result = capture_once({**payload, "event": {"trigger": "redis_stream", "channel": channel_name, "raw": text[-1000:]}})
                publish_result(payload, result)
            except Exception as error:
                result = {
                    "ok": False,
                    "error": str(error),
                    "event": {"trigger": "redis_stream", "channel": channel_name, "raw": text[-1000:]},
                    "failedAt": datetime.now(timezone.utc).isoformat()
                }
            write_stream_cursor(channel_name, next_id)
            print(json.dumps(result, ensure_ascii=False), flush=True)
    print(json.dumps({"ok": True, "mode": "redis_pubsub", "channel": channel_name}, ensure_ascii=False), flush=True)
    redis_command(host, port, "SUBSCRIBE", channel_name)
    # For pub/sub, keep the service alive. A production-grade subscriber should parse RESP incrementally.
    while True:
        result = capture_once({**payload, "event": {"trigger": "redis_pubsub", "channel": channel_name}})
        publish_result(payload, result)
        print(json.dumps(result, ensure_ascii=False), flush=True)
        time.sleep(max(1, int((payload.get("config") or {}).get("captureIntervalSec") or 5)))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="Capture one frame and exit.")
    parser.add_argument("--loop", action="store_true", help="Capture frames until stopped.")
    args = parser.parse_args()
    payload = load_payload()
    if args.loop:
        if run_loop_with_redis(payload):
            return
        result = capture_once(payload)
        publish_result(payload, result)
        print(json.dumps({**result, "mode": "one_shot_start"}, ensure_ascii=False), flush=True)
    else:
        result = capture_once(payload)
        publish_result(payload, result)
        print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
