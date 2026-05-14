#!/usr/bin/env python3
import argparse
import json
import time
from pathlib import Path

try:
    import gi
    gi.require_version("Gst", "1.0")
    from gi.repository import Gst, GLib
    import pyds
except Exception as exc:
    raise SystemExit(
        "Missing DeepStream Python runtime gi/Gst/pyds. "
        "Run inside a DeepStream image with Python bindings installed. "
        f"Original error: {exc}"
    )

try:
    import cv2
    import numpy as np
except Exception:
    cv2 = None
    np = None


class LprRuntime:
    def __init__(self, config):
        self.config = config
        self.app_root = Path(config["appRoot"])
        self.runtime_dir = self.app_root / "runtime"
        self.capture_dir = self.runtime_dir / "captures"
        self.events_file = self.runtime_dir / "events.jsonl"
        self.capture_dir.mkdir(parents=True, exist_ok=True)
        self.front_class_ids = set(config.get("frontVehicleClassIds", [0]))
        self.roi = config.get("roi", {}).get("polygon", [])
        self.cooldown_sec = float(config.get("captureCooldownSec", 30))
        self.captured = {}

    def point_in_polygon(self, x, y):
        if len(self.roi) < 3:
            return True
        inside = False
        j = len(self.roi) - 1
        for i, point in enumerate(self.roi):
            xi, yi = point
            xj, yj = self.roi[j]
            intersects = ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi)
            if intersects:
                inside = not inside
            j = i
        return inside

    def should_capture(self, object_id):
        now = time.time()
        previous = self.captured.get(object_id)
        if previous and now - previous < self.cooldown_sec:
            return False
        self.captured[object_id] = now
        return True

    def extract_plate_text(self, obj_meta):
        labels = []
        classifier_meta_list = obj_meta.classifier_meta_list
        while classifier_meta_list is not None:
            classifier_meta = pyds.NvDsClassifierMeta.cast(classifier_meta_list.data)
            label_info_list = classifier_meta.label_info_list
            while label_info_list is not None:
                label_info = pyds.NvDsLabelInfo.cast(label_info_list.data)
                if label_info.result_label:
                    labels.append(label_info.result_label)
                label_info_list = label_info_list.next
            classifier_meta_list = classifier_meta_list.next
        return "".join(labels) if labels else "UNKNOWN"

    def save_event(self, event):
        with self.events_file.open("a", encoding="utf-8") as file:
            file.write(json.dumps(event, ensure_ascii=False) + "\n")

    def save_frame(self, gst_buffer, frame_meta, obj_meta, event_id):
        if cv2 is None or np is None:
            return None
        try:
            surface = pyds.get_nvds_buf_surface(hash(gst_buffer), frame_meta.batch_id)
            frame = np.array(surface, copy=True, order="C")
            frame = cv2.cvtColor(frame, cv2.COLOR_RGBA2BGR)
            rect = obj_meta.rect_params
            left = max(0, int(rect.left))
            top = max(0, int(rect.top))
            right = min(frame.shape[1], int(rect.left + rect.width))
            bottom = min(frame.shape[0], int(rect.top + rect.height))
            cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
            path = self.capture_dir / f"{event_id}.jpg"
            cv2.imwrite(str(path), frame)
            return str(path)
        except Exception as exc:
            print(f"Failed to save frame: {exc}")
            return None

    def probe(self, pad, info):
        gst_buffer = info.get_buffer()
        if not gst_buffer:
            return Gst.PadProbeReturn.OK
        batch_meta = pyds.gst_buffer_get_nvds_batch_meta(hash(gst_buffer))
        frame_list = batch_meta.frame_meta_list
        while frame_list is not None:
            frame_meta = pyds.NvDsFrameMeta.cast(frame_list.data)
            obj_list = frame_meta.obj_meta_list
            while obj_list is not None:
                obj_meta = pyds.NvDsObjectMeta.cast(obj_list.data)
                if obj_meta.unique_component_id == 1 and obj_meta.class_id in self.front_class_ids:
                    rect = obj_meta.rect_params
                    center_x = float(rect.left + rect.width / 2)
                    center_y = float(rect.top + rect.height / 2)
                    object_id = int(obj_meta.object_id)
                    if self.point_in_polygon(center_x, center_y) and self.should_capture(object_id):
                        event_id = f"{int(time.time())}_{frame_meta.frame_num}_{object_id}"
                        plate_text = self.extract_plate_text(obj_meta)
                        image_path = self.save_frame(gst_buffer, frame_meta, obj_meta, event_id)
                        event = {
                            "eventId": event_id,
                            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                            "stream": self.config.get("inputUri") or self.config.get("rtspUrl"),
                            "objectId": object_id,
                            "frameNum": int(frame_meta.frame_num),
                            "classId": int(obj_meta.class_id),
                            "bbox": {
                                "left": float(rect.left),
                                "top": float(rect.top),
                                "width": float(rect.width),
                                "height": float(rect.height),
                            },
                            "center": {"x": center_x, "y": center_y},
                            "plateText": plate_text,
                            "imagePath": image_path,
                        }
                        print(json.dumps(event, ensure_ascii=False))
                        self.save_event(event)
                obj_list = obj_list.next
            frame_list = frame_list.next
        return Gst.PadProbeReturn.OK


def make_element(factory, name):
    element = Gst.ElementFactory.make(factory, name)
    if not element:
        raise RuntimeError(f"Could not create GStreamer element: {factory}")
    return element


def on_decodebin_pad_added(_decodebin, pad, streammux):
    caps = pad.get_current_caps()
    if caps and "video" not in caps.to_string():
        return
    sink_pad = streammux.request_pad_simple("sink_0")
    if not sink_pad:
        raise RuntimeError("Could not get streammux sink pad")
    if pad.link(sink_pad) != Gst.PadLinkReturn.OK:
        raise RuntimeError("Failed to link decodebin to streammux")


def build_pipeline(runtime):
    config = runtime.config
    input_uri = config.get("inputUri") or config.get("rtspUrl")
    if not input_uri:
        raise RuntimeError("Missing inputUri/rtspUrl")
    Gst.init(None)
    pipeline = Gst.Pipeline.new("deepstream-lpr-pipeline")
    source = make_element("uridecodebin", "input-source")
    streammux = make_element("nvstreammux", "streammux")
    pgie = make_element("nvinfer", "vehicle-front-detector")
    tracker = make_element("nvtracker", "tracker")
    plate_sgie = make_element("nvinfer", "plate-detector")
    ocr_sgie = make_element("nvinfer", "plate-ocr")
    conv = make_element("nvvideoconvert", "converter")
    osd = make_element("nvdsosd", "onscreendisplay")
    sink = make_element("fakesink", "sink")

    source.set_property("uri", input_uri)
    streammux.set_property("batch-size", 1)
    streammux.set_property("width", int(config.get("streamWidth", 1920)))
    streammux.set_property("height", int(config.get("streamHeight", 1080)))
    streammux.set_property("live-source", 1 if input_uri.lower().startswith("rtsp://") else 0)
    streammux.set_property("batched-push-timeout", 40000)
    pgie.set_property("config-file-path", str(runtime.runtime_dir / "generated" / "config_infer_vehicle_front.txt"))
    tracker.set_property("ll-lib-file", config.get("trackerLib", "/opt/nvidia/deepstream/deepstream/lib/libnvds_nvmultiobjecttracker.so"))
    tracker.set_property("ll-config-file", str(runtime.runtime_dir / "generated" / "tracker_config.yml"))
    plate_sgie.set_property("config-file-path", str(runtime.runtime_dir / "generated" / "config_infer_plate_detector.txt"))
    ocr_sgie.set_property("config-file-path", str(runtime.runtime_dir / "generated" / "config_infer_plate_ocr.txt"))
    sink.set_property("sync", False)

    for element in [source, streammux, pgie, tracker, plate_sgie, ocr_sgie, conv, osd, sink]:
        pipeline.add(element)
    source.connect("pad-added", on_decodebin_pad_added, streammux)
    for left, right in [(streammux, pgie), (pgie, tracker), (tracker, plate_sgie), (plate_sgie, ocr_sgie), (ocr_sgie, conv), (conv, osd), (osd, sink)]:
        if not left.link(right):
            raise RuntimeError(f"Could not link {left.name} -> {right.name}")
    osd.get_static_pad("sink").add_probe(Gst.PadProbeType.BUFFER, runtime.probe)
    return pipeline


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--input-uri", default="")
    args = parser.parse_args()
    with open(args.config, "r", encoding="utf-8") as file:
        config = json.load(file)
    if args.input_uri:
        config["inputUri"] = args.input_uri
    runtime = LprRuntime(config)
    pipeline = build_pipeline(runtime)
    loop = GLib.MainLoop()
    bus = pipeline.get_bus()
    bus.add_signal_watch()

    def on_message(_bus, message):
        if message.type == Gst.MessageType.ERROR:
            err, debug = message.parse_error()
            print(f"ERROR: {err}: {debug}")
            loop.quit()
        elif message.type == Gst.MessageType.EOS:
            loop.quit()

    bus.connect("message", on_message)
    pipeline.set_state(Gst.State.PLAYING)
    try:
        loop.run()
    finally:
        pipeline.set_state(Gst.State.NULL)


if __name__ == "__main__":
    main()
