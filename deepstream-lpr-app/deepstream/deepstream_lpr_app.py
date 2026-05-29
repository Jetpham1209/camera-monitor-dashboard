#!/usr/bin/env python3
import argparse
import ctypes
import json
import re
import socket
import struct
import time
from pathlib import Path
from urllib.parse import unquote, urlparse

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
    import numpy as np
except Exception:
    np = None

try:
    import cv2
except Exception:
    cv2 = None

try:
    from PIL import Image, ImageDraw
except Exception:
    Image = None
    ImageDraw = None


class LprRuntime:
    def __init__(self, config):
        self.config = config
        self.app_root = Path(config["appRoot"])
        self.runtime_dir = self.app_root / "runtime"
        self.capture_dir = self.runtime_dir / "captures"
        self.events_file = self.runtime_dir / "events.jsonl"
        self.status_file = self.runtime_dir / "status.json"
        self.connections_file = self.runtime_dir / "connections.json"
        self.capture_dir.mkdir(parents=True, exist_ok=True)
        self.last_capture_error = ""
        self.streams = self.normalize_streams(config)
        self.connections = self.load_connections()
        self.event_outputs = self.normalize_event_outputs(config)
        self.captured = {}
        self.object_zone_history = {}
        self.started_at = time.time()
        self.fps_stats = {}
        self.last_status_write = 0.0
        self.processor_type = self.normalize_processor_type(config)
        self.labels = self.load_labels(config)
        self.pipeline_stages = self.normalize_pipeline_stages(config)
        self.pgie_vehicle_class_ids = self.primary_vehicle_class_ids()
        self.component_names = {
            int(stage.get("gieId", index + 1)): stage.get("modelGroup", f"gie_{index + 1}")
            for index, stage in enumerate(self.pipeline_stages)
        }
        self.component_class_filters = {
            int(stage.get("gieId", index + 1)): (
                self.stage_class_ids(stage.get("operateOnClassIds")) if not stage.get("operateOnGieId") else set()
            )
            for index, stage in enumerate(self.pipeline_stages)
        }
        self.image_test_vehicle_ids = set(config.get("imageTest", {}).get("vehicleClassIds") or [2, 3, 5, 7])
        self.test_mode = config.get("testMode", "pipeline")
        self.image_debug_seen = set()
        self.image_debug_final_frames = set()
        self.ocr_postprocess = {
            "maxChars": int(config.get("ocrPostprocess", {}).get("maxChars", 12)),
            "minConfidence": float(config.get("ocrPostprocess", {}).get("minConfidence", 0.5)),
            "nmsIou": float(config.get("ocrPostprocess", {}).get("nmsIou", 0.5)),
            "minWidthRatio": float(config.get("ocrPostprocess", {}).get("minWidthRatio", 0.01)),
            "maxWidthRatio": float(config.get("ocrPostprocess", {}).get("maxWidthRatio", 0.25)),
            "minHeightRatio": float(config.get("ocrPostprocess", {}).get("minHeightRatio", 0.18)),
            "maxHeightRatio": float(config.get("ocrPostprocess", {}).get("maxHeightRatio", 1.15)),
        }
        self.write_status("starting", "Runtime initialized.")

    def load_connections(self):
        try:
            if self.connections_file.exists():
                return json.loads(self.connections_file.read_text(encoding="utf-8"))
        except Exception as exc:
            print(f"Failed to load connections config: {exc}")
        return {"providers": {}, "channels": []}

    def normalize_event_outputs(self, config):
        outputs = []
        raw = config.get("eventOutputs")
        if not raw and isinstance(config.get("deployApps"), list):
            active_id = config.get("activeAppId") or config.get("selectedAppId")
            for app in config.get("deployApps", []):
                if active_id and app.get("id") != active_id:
                    continue
                for item in app.get("eventOutputs") or []:
                    outputs.append(item)
            if not outputs:
                for app in config.get("deployApps", []):
                    for item in app.get("eventOutputs") or []:
                        outputs.append(item)
        elif isinstance(raw, list):
            outputs = raw
        normalized = []
        for item in outputs:
            if not isinstance(item, dict) or item.get("enabled") is False:
                continue
            channel_id = str(item.get("channelId") or "").strip()
            if not channel_id:
                continue
            normalized.append({
                "eventType": str(item.get("eventType") or "*").strip() or "*",
                "channelId": channel_id,
                "payload": str(item.get("payload") or "full").strip() or "full",
                "template": item.get("template") if isinstance(item.get("template"), (dict, list, str)) else "",
                "transformLanguage": str(item.get("transformLanguage") or "python").strip() or "python",
                "transformScript": str(item.get("transformScript") or "").strip(),
            })
        if normalized:
            print(f"Message outputs enabled: {len(normalized)}")
        return normalized

    def connection_channel(self, channel_id):
        for channel in self.connections.get("channels") or []:
            if str(channel.get("id")) == str(channel_id):
                return channel
        return None

    def connection_provider(self, provider_name):
        return (self.connections.get("providers") or {}).get(provider_name)

    def redis_command(self, provider, args, timeout=1.5):
        def encode(parts):
            payload = f"*{len(parts)}\r\n"
            for part in parts:
                value = str(part)
                payload += f"${len(value.encode('utf-8'))}\r\n{value}\r\n"
            return payload.encode("utf-8")

        def read_response(sock):
            data = b""
            while True:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                data += chunk
                if b"\r\n" in data:
                    break
            if data.startswith(b"-"):
                raise RuntimeError(data.decode("utf-8", "replace").strip())
            return data

        with socket.create_connection((provider.get("host", "127.0.0.1"), int(provider.get("port", 6379))), timeout=timeout) as sock:
            sock.settimeout(timeout)
            sock.sendall(encode(args))
            return read_response(sock)

    def compact_event_payload(self, event, mode):
        if mode in {"minimal", "compact"}:
            return {
                "eventType": event.get("eventType"),
                "eventId": event.get("eventId"),
                "ts": event.get("ts"),
                "cameraId": event.get("cameraId"),
                "cameraName": event.get("cameraName"),
                "zoneId": event.get("zoneId"),
                "zoneName": event.get("zoneName"),
                "classId": event.get("classId"),
                "plateText": event.get("plateText"),
                "imageUrl": event.get("imageUrl"),
            }
        return event

    def event_path_value(self, event, path, default=""):
        current = event
        for part in str(path or "").split("."):
            if part == "":
                continue
            if isinstance(current, list) and part.isdigit():
                index = int(part)
                current = current[index] if 0 <= index < len(current) else default
            elif isinstance(current, dict):
                current = current.get(part, default)
            else:
                return default
        return current

    def render_template_value(self, value, event):
        if isinstance(value, dict):
            return {key: self.render_template_value(item, event) for key, item in value.items()}
        if isinstance(value, list):
            return [self.render_template_value(item, event) for item in value]
        if not isinstance(value, str):
            return value
        exact = re.fullmatch(r"\{\{\s*([^}]+?)\s*\}\}", value)
        if exact:
            return self.event_path_value(event, exact.group(1))
        def replace(match):
            replacement = self.event_path_value(event, match.group(1))
            if replacement is None:
                return ""
            if isinstance(replacement, (dict, list)):
                return json.dumps(replacement, ensure_ascii=False)
            return str(replacement)
        return re.sub(r"\{\{\s*([^}]+?)\s*\}\}", replace, value)

    def template_event_payload(self, event, template):
        if not template:
            return self.compact_event_payload(event, "minimal")
        parsed = template
        if isinstance(template, str):
            parsed = json.loads(template)
        return self.render_template_value(parsed, event)

    def transform_event_payload(self, event, script):
        if not script:
            return self.compact_event_payload(event, "minimal")
        safe_builtins = {
            "abs": abs,
            "bool": bool,
            "dict": dict,
            "float": float,
            "int": int,
            "len": len,
            "list": list,
            "max": max,
            "min": min,
            "round": round,
            "str": str,
            "sum": sum,
        }
        globals_scope = {"__builtins__": safe_builtins, "json": json}
        if re.search(r"(^|\n)\s*return\s+", script):
            body = "\n".join(f"    {line}" for line in script.splitlines())
            wrapped = f"def transform(event):\n{body}\n"
            locals_scope = {}
            exec(wrapped, globals_scope, locals_scope)
            result = locals_scope["transform"](event)
        else:
            locals_scope = {"event": event, "result": None}
            exec(script, globals_scope, locals_scope)
            result = locals_scope.get("result")
        json.dumps(result, ensure_ascii=False)
        return result

    def output_event_payload(self, event, output):
        mode = output.get("payload") or "full"
        if mode == "template":
            return self.template_event_payload(event, output.get("template"))
        if mode == "transform":
            return self.transform_event_payload(event, output.get("transformScript"))
        return self.compact_event_payload(event, mode)

    def publish_event(self, event):
        if not self.event_outputs:
            return
        for output in self.event_outputs:
            event_type = output.get("eventType") or "*"
            if event_type not in {"*", event.get("eventType")}:
                continue
            channel = self.connection_channel(output.get("channelId"))
            if not channel or channel.get("enabled") is False:
                print(f"Message output skipped: channel not found/disabled ({output.get('channelId')})")
                continue
            provider = self.connection_provider(channel.get("provider"))
            if not provider or provider.get("enabled") is False:
                print(f"Message output skipped: provider disabled ({channel.get('provider')})")
                continue
            try:
                payload = json.dumps(self.output_event_payload(event, output), ensure_ascii=False)
                if channel.get("provider") == "redis":
                    if channel.get("type") == "stream":
                        self.redis_command(provider, ["XADD", channel.get("name"), "*", "event", payload])
                    else:
                        self.redis_command(provider, ["PUBLISH", channel.get("name"), payload])
                else:
                    print(f"Message output skipped: provider not implemented in runtime ({channel.get('provider')})")
            except Exception as exc:
                print(f"Message output failed for {channel.get('name')}: {exc}")

    def normalize_processor_type(self, config):
        processor = config.get("processor") or {}
        value = processor.get("type") if isinstance(processor, dict) else processor
        return "generic_detection" if value == "generic_detection" else "lpr"

    def primary_vehicle_class_ids(self):
        for stage in self.pipeline_stages:
            if int(stage.get("gieId", 0)) == 1:
                ids = stage.get("operateOnClassIds")
                if isinstance(ids, list):
                    return {int(item) for item in ids if str(item).strip() != ""}
                if isinstance(ids, str) and ids.strip():
                    return {int(item) for item in re.split(r"[;,\\s]+", ids) if item.strip().isdigit()}
        return set()

    def stage_class_ids(self, value):
        if isinstance(value, list):
            return {int(item) for item in value if str(item).strip() != ""}
        if isinstance(value, str) and value.strip():
            return {int(item) for item in re.split(r"[;,\\s]+", value) if item.strip().isdigit()}
        return set()

    def payload_selected(self, payload):
        selected = self.component_class_filters.get(int(payload.get("componentId", 0))) or set()
        return not selected or int(payload.get("classId", -1)) in selected

    def now_iso(self):
        return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    def write_status(self, state="running", message=""):
        payload = {
            "state": state,
            "message": message,
            "processorType": self.processor_type,
            "startedAt": self.now_iso() if state in {"starting", "playing"} else None,
            "updatedAt": self.now_iso(),
            "uptimeSec": round(time.time() - self.started_at, 3),
            "sources": [
                {
                    "sourceId": index,
                    "cameraId": stream.get("id", f"camera-{index + 1}"),
                    "cameraName": stream.get("name", f"Camera {index + 1}"),
                    "uri": stream.get("rtspUrl", ""),
                    **self.fps_stats.get(index, {"fps": 0.0, "frameCount": 0, "lastFrameAt": None}),
                }
                for index, stream in enumerate(self.streams)
            ],
        }
        temp_file = self.status_file.with_suffix(".json.tmp")
        temp_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temp_file.replace(self.status_file)

    def update_fps(self, frame_meta):
        now = time.time()
        source_id = int(frame_meta.source_id)
        stats = self.fps_stats.setdefault(source_id, {
            "windowStart": now,
            "windowFrames": 0,
            "frameCount": 0,
            "fps": 0.0,
            "lastFrameAt": None,
        })
        stats["windowFrames"] += 1
        stats["frameCount"] += 1
        stats["lastFrameAt"] = self.now_iso()
        elapsed = max(1e-6, now - stats["windowStart"])
        if elapsed >= 1.0:
            stats["fps"] = round(stats["windowFrames"] / elapsed, 2)
            stats["windowStart"] = now
            stats["windowFrames"] = 0
        if now - self.last_status_write >= 1.0:
            self.last_status_write = now
            self.write_status("playing", "DeepStream pipeline is running.")

    def load_labels(self, config):
        labels = {}
        for group, model in (config.get("models") or {}).items():
            label_path = model.get("labels")
            if not label_path:
                continue
            try:
                labels[group] = Path(label_path).read_text(encoding="utf-8").splitlines()
            except Exception:
                labels[group] = []
        return labels

    def normalize_pipeline_stages(self, config):
        stages = config.get("pipelineStages") or [
            {"id": "pgie", "name": "PGIE Vehicle", "modelGroup": "vehicle_front", "gieId": 1, "configFile": "/workspace/deepstream-lpr-app/runtime/generated/config_infer_vehicle_front.txt", "enabled": True},
            {"id": "sgie-plate", "name": "SGIE Plate", "modelGroup": "plate_detector", "gieId": 2, "configFile": "/workspace/deepstream-lpr-app/runtime/generated/config_infer_plate_detector.txt", "enabled": True},
            {"id": "tgie-character", "name": "TGIE Character", "modelGroup": "plate_ocr", "gieId": 3, "configFile": "/workspace/deepstream-lpr-app/runtime/generated/config_infer_plate_ocr.txt", "enabled": True},
        ]
        normalized = []
        for index, stage in enumerate(stages):
            if stage.get("enabled") is False:
                continue
            normalized.append({
                "id": re.sub(r"[^a-zA-Z0-9_-]+", "_", str(stage.get("id") or f"gie-{index + 1}")),
                "name": stage.get("name") or f"GIE {index + 1}",
                "modelGroup": stage.get("modelGroup") or f"gie_{index + 1}",
                "gieId": int(stage.get("gieId") or index + 1),
                "operateOnGieId": stage.get("operateOnGieId"),
                "operateOnClassIds": stage.get("operateOnClassIds") or [],
                "configFile": stage.get("configFile") or f"/workspace/deepstream-lpr-app/runtime/generated/config_infer_{stage.get('id') or f'gie-{index + 1}'}.txt",
                "ready": stage.get("ready", True),
            })
        return normalized

    def normalize_streams(self, config):
        if config.get("inputUri"):
            base = (config.get("streams") or [{}])[0]
            if config.get("testMode") == "image-debug":
                vehicle_ids = config.get("imageTest", {}).get("vehicleClassIds") or [2, 3, 5, 7]
                return [{
                    "id": "image-test",
                    "name": "Image test",
                    "rtspUrl": config["inputUri"],
                    "roi": {"polygon": []},
                    "zones": [],
                    "frontVehicleClassIds": vehicle_ids,
                    "captureCooldownSec": 0,
                }]
            return [{
                "id": base.get("id", "test-input"),
                "name": base.get("name", "Test input"),
                "rtspUrl": config["inputUri"],
                "roi": base.get("roi") or config.get("roi", {}),
                "zones": base.get("zones") or config.get("zones", []),
                "frontVehicleClassIds": base.get("frontVehicleClassIds", config.get("frontVehicleClassIds", [0])),
                "captureCooldownSec": base.get("captureCooldownSec", config.get("captureCooldownSec", 30)),
            }]
        streams = [item for item in config.get("streams", []) if item.get("enabled", True) and item.get("rtspUrl")]
        if streams:
            return streams
        return [{
            "id": "camera-1",
            "name": "Camera 1",
            "rtspUrl": config.get("rtspUrl", ""),
            "roi": config.get("roi", {}),
            "zones": config.get("zones", []),
            "frontVehicleClassIds": config.get("frontVehicleClassIds", [0]),
            "captureCooldownSec": config.get("captureCooldownSec", 30),
        }]

    def stream_config(self, source_id):
        if 0 <= source_id < len(self.streams):
            return self.streams[source_id]
        return self.streams[0]

    def point_in_polygon(self, polygon, x, y):
        if len(polygon) < 3:
            return True
        inside = False
        j = len(polygon) - 1
        for i, point in enumerate(polygon):
            xi, yi = point
            xj, yj = polygon[j]
            intersects = ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi)
            if intersects:
                inside = not inside
            j = i
        return inside

    def class_id_set(self, value):
        if isinstance(value, list):
            return {int(item) for item in value if str(item).strip() != ""}
        if isinstance(value, str) and value.strip():
            return {int(item) for item in re.split(r"[;,\\s]+", value) if item.strip().lstrip("-").isdigit()}
        return set()

    def stream_zones(self, stream_config):
        zones = stream_config.get("zones") or []
        normalized = []
        for index, zone in enumerate(zones):
            if zone.get("enabled", True) is False:
                continue
            mode = zone.get("mode") or "capture_when_inside"
            if mode not in {"capture_when_inside", "alert_when_inside", "lpr_only_inside", "detect_only_inside", "ignore_inside"}:
                mode = "capture_when_inside"
            normalized.append({
                "id": str(zone.get("id") or f"zone-{index + 1}"),
                "name": zone.get("name") or f"Zone {index + 1}",
                "mode": mode,
                "polygon": zone.get("polygon") or zone.get("points") or [],
                "gieId": int(zone.get("gieId") or 0),
                "classIds": self.class_id_set(zone.get("classIds")),
                "cooldownSec": zone.get("cooldownSec", ""),
            })
        if normalized:
            return normalized
        polygon = stream_config.get("roi", {}).get("polygon", [])
        if polygon:
            return [{
                "id": "zone-1",
                "name": "Zone 1",
                "mode": "capture_when_inside",
                "polygon": polygon,
                "gieId": 1,
                "classIds": self.class_id_set(stream_config.get("frontVehicleClassIds", [])),
                "cooldownSec": stream_config.get("captureCooldownSec", 30),
            }]
        return [{
            "id": "full-frame",
            "name": "Full frame",
            "mode": "capture_when_inside",
            "polygon": [],
            "gieId": 1,
            "classIds": set(),
            "cooldownSec": stream_config.get("captureCooldownSec", 30),
        }]

    def stream_rules(self, stream_config):
        rules = stream_config.get("rules") or []
        normalized = []
        for index, rule in enumerate(rules):
            if rule.get("enabled", True) is False:
                continue
            rule_type = rule.get("type") or "sequence"
            if rule_type != "sequence":
                continue
            first_zone_id = str(rule.get("firstZoneId") or "").strip()
            second_zone_id = str(rule.get("secondZoneId") or "").strip()
            if not first_zone_id or not second_zone_id or first_zone_id == second_zone_id:
                continue
            action = rule.get("action") or "capture"
            if action not in {"capture", "ignore"}:
                action = "capture"
            reverse_action = rule.get("reverseAction") or "ignore"
            if reverse_action not in {"capture", "ignore"}:
                reverse_action = "ignore"
            normalized.append({
                "id": str(rule.get("id") or f"rule-{index + 1}"),
                "name": rule.get("name") or f"Rule {index + 1}",
                "type": "sequence",
                "firstZoneId": first_zone_id,
                "secondZoneId": second_zone_id,
                "action": action,
                "reverseAction": reverse_action,
                "maxTimeSec": float(rule.get("maxTimeSec") or 30),
                "cooldownSec": rule.get("cooldownSec", ""),
                "gieId": int(rule.get("gieId") or 0),
                "classIds": set(),
            })
        return normalized

    def zone_matches(self, zone, component_id, class_id, x, y):
        gie_id = int(zone.get("gieId") or 0)
        if gie_id and int(component_id) != gie_id:
            return False
        class_ids = zone.get("classIds") or set()
        if class_ids and int(class_id) not in class_ids:
            return False
        return self.point_in_polygon(zone.get("polygon") or [], x, y)

    def all_matching_zones(self, stream_config, component_id, class_id, x, y):
        zones = self.stream_zones(stream_config)
        ignored = [
            zone for zone in zones
            if zone.get("mode") == "ignore_inside" and self.zone_matches(zone, component_id, class_id, x, y)
        ]
        if ignored:
            return []
        return [
            zone for zone in zones
            if zone.get("mode") != "ignore_inside" and self.zone_matches(zone, component_id, class_id, x, y)
        ]

    def matching_zones(self, stream_config, component_id, class_id, x, y, processor_type):
        zones = self.stream_zones(stream_config)
        ignored = [
            zone for zone in zones
            if zone.get("mode") == "ignore_inside" and self.zone_matches(zone, component_id, class_id, x, y)
        ]
        if ignored:
            return []
        allowed_modes = {"capture_when_inside", "alert_when_inside"}
        allowed_modes.add("lpr_only_inside" if processor_type == "lpr" else "detect_only_inside")
        return [
            zone for zone in zones
            if zone.get("mode") in allowed_modes and self.zone_matches(zone, component_id, class_id, x, y)
        ]

    def should_capture(self, source_id, object_id, cooldown_sec, capture_kind="object"):
        now = time.time()
        key = (capture_kind, source_id, object_id)
        previous = self.captured.get(key)
        if previous and now - previous < cooldown_sec:
            return False
        self.captured[key] = now
        return True

    def update_object_zone_history(self, source_id, object_key, zones):
        now = time.time()
        key = (source_id, object_key)
        history = self.object_zone_history.setdefault(key, [])
        seen_now = {zone.get("id") for zone in zones}
        for zone in zones:
            zone_id = zone.get("id")
            if not zone_id:
                continue
            if history and history[-1].get("zoneId") == zone_id:
                continue
            history.append({
                "zoneId": zone_id,
                "zoneName": zone.get("name"),
                "ts": now
            })
        self.object_zone_history[key] = [
            item for item in history[-20:]
            if now - float(item.get("ts") or now) <= 120 or item.get("zoneId") in seen_now
        ]
        return self.object_zone_history[key]

    def sequence_rule_action(self, rule, history, current_zone_id):
        now = time.time()
        first = rule.get("firstZoneId")
        second = rule.get("secondZoneId")
        max_time = float(rule.get("maxTimeSec") or 30)
        if current_zone_id == second:
            for item in reversed(history):
                if item.get("zoneId") == first and now - float(item.get("ts") or 0) <= max_time:
                    return rule.get("action") or "capture", "forward"
        if current_zone_id == first:
            for item in reversed(history):
                if item.get("zoneId") == second and now - float(item.get("ts") or 0) <= max_time:
                    return rule.get("reverseAction") or "ignore", "reverse"
        return None, None

    def rule_capture_targets(self, stream_config, source_id, object_key, component_id, class_id, zones):
        rules = self.stream_rules(stream_config)
        if not rules:
            return []
        history = self.update_object_zone_history(source_id, object_key, zones)
        targets = []
        zones_by_id = {zone.get("id"): zone for zone in zones}
        for rule in rules:
            gie_id = int(rule.get("gieId") or 0)
            if gie_id and int(component_id) != gie_id:
                continue
            for zone in zones:
                action, direction = self.sequence_rule_action(rule, history, zone.get("id"))
                if action != "capture":
                    continue
                cooldown_sec = float(rule.get("cooldownSec") or zone.get("cooldownSec") or stream_config.get("captureCooldownSec", 30))
                targets.append({
                    "zone": zones_by_id.get(zone.get("id"), zone),
                    "rule": rule,
                    "direction": direction,
                    "cooldownSec": cooldown_sec,
                })
        return targets

    def extract_plate_text(self, obj_meta):
        labels = self.extract_classifier_labels(obj_meta)
        return "".join(labels) if labels else "UNKNOWN"

    def extract_classifier_labels(self, obj_meta):
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
        return labels

    def extract_tensor_predictions(self, obj_meta):
        predictions = []
        user_meta_list = obj_meta.obj_user_meta_list
        while user_meta_list is not None:
            try:
                user_meta = pyds.NvDsUserMeta.cast(user_meta_list.data)
                if user_meta.base_meta.meta_type != pyds.NvDsMetaType.NVDSINFER_TENSOR_OUTPUT_META:
                    user_meta_list = user_meta_list.next
                    continue
                tensor_meta = pyds.NvDsInferTensorMeta.cast(user_meta.user_meta_data)
                component_id = int(tensor_meta.unique_id)
                labels = self.labels.get(self.component_name(component_id)) or []
                for layer_index in range(tensor_meta.num_output_layers):
                    layer = pyds.get_nvds_LayerInfo(tensor_meta, layer_index)
                    dims = layer.inferDims
                    count = 1
                    for dim_index in range(dims.numDims):
                        count *= int(dims.d[dim_index])
                    if count <= 0 or count > 10000:
                        continue
                    ptr = ctypes.cast(pyds.get_ptr(layer.buffer), ctypes.POINTER(ctypes.c_float))
                    values = [float(ptr[index]) for index in range(count)]
                    best_index = max(range(count), key=lambda index: values[index])
                    predictions.append({
                        "componentId": component_id,
                        "component": self.component_name(component_id),
                        "layer": layer.layerName,
                        "index": int(best_index),
                        "label": labels[best_index] if 0 <= best_index < len(labels) else str(best_index),
                        "score": values[best_index],
                    })
            except Exception as exc:
                predictions.append({"error": str(exc)})
            user_meta_list = user_meta_list.next
        return predictions

    def component_name(self, component_id):
        return self.component_names.get(component_id, f"gie_{component_id}")

    def label_for(self, component_id, class_id):
        group = self.component_name(component_id)
        labels = self.labels.get(group) or []
        if 0 <= class_id < len(labels):
            return labels[class_id]
        return str(class_id)

    def parent_object_id(self, obj_meta):
        try:
            if obj_meta.parent:
                parent = pyds.NvDsObjectMeta.cast(obj_meta.parent)
                return int(parent.object_id)
        except Exception:
            return None
        return None

    def save_event(self, event):
        with self.events_file.open("a", encoding="utf-8") as file:
            file.write(json.dumps(event, ensure_ascii=False) + "\n")
        self.publish_event(event)

    def draw_box_rgba(self, frame, left, top, right, bottom):
        height, width = frame.shape[:2]
        left = max(0, min(width - 1, int(left)))
        right = max(0, min(width - 1, int(right)))
        top = max(0, min(height - 1, int(top)))
        bottom = max(0, min(height - 1, int(bottom)))
        if right <= left or bottom <= top:
            return frame
        color = [0, 255, 0, 255] if frame.shape[2] >= 4 else [0, 255, 0]
        thickness = 2
        frame[top:min(bottom + 1, top + thickness), left:right + 1] = color
        frame[max(top, bottom - thickness + 1):bottom + 1, left:right + 1] = color
        frame[top:bottom + 1, left:min(right + 1, left + thickness)] = color
        frame[top:bottom + 1, max(left, right - thickness + 1):right + 1] = color
        return frame

    def write_bmp(self, path, rgb_frame):
        height, width = rgb_frame.shape[:2]
        row_stride = ((width * 3 + 3) // 4) * 4
        pixel_size = row_stride * height
        file_size = 14 + 40 + pixel_size
        with path.open("wb") as file:
            file.write(b"BM")
            file.write(struct.pack("<IHHI", file_size, 0, 0, 54))
            file.write(struct.pack("<IiiHHIIiiII", 40, width, height, 1, 24, 0, pixel_size, 2835, 2835, 0, 0))
            padding = b"\x00" * (row_stride - width * 3)
            bgr = rgb_frame[:, :, ::-1]
            for row in range(height - 1, -1, -1):
                file.write(bgr[row].astype("uint8").tobytes())
                if padding:
                    file.write(padding)

    def save_frame(self, gst_buffer, frame_meta, obj_meta, event_id, stream_config=None):
        self.last_capture_error = ""
        if np is None:
            self.last_capture_error = "numpy is not available in the DeepStream runtime image."
            print(f"Failed to save frame: {self.last_capture_error}")
            return None
        try:
            stream_config = stream_config or self.stream_config(int(frame_meta.source_id))
            camera_id = re.sub(r"[^a-zA-Z0-9_.-]+", "-", str(stream_config.get("id", f"camera-{int(frame_meta.source_id) + 1}"))).strip("-") or "camera"
            date_dir = time.strftime("%Y-%m-%d", time.localtime())
            target_dir = self.capture_dir / date_dir / camera_id
            target_dir.mkdir(parents=True, exist_ok=True)
            surface = pyds.get_nvds_buf_surface(hash(gst_buffer), frame_meta.batch_id)
            frame = np.array(surface, copy=True, order="C")
            rect = obj_meta.rect_params
            left = max(0, int(rect.left))
            top = max(0, int(rect.top))
            right = min(frame.shape[1], int(rect.left + rect.width))
            bottom = min(frame.shape[0], int(rect.top + rect.height))

            if cv2 is not None:
                path = target_dir / f"{event_id}.jpg"
                frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGBA2BGR)
                ok = cv2.imwrite(str(path), frame_bgr)
                if not ok:
                    self.last_capture_error = f"cv2.imwrite returned false for {path}"
                    print(f"Failed to save frame: {self.last_capture_error}")
                    return None
            elif Image is not None:
                path = target_dir / f"{event_id}.jpg"
                image = Image.fromarray(frame[:, :, :3], "RGB")
                image.save(path, format="JPEG", quality=90)
            else:
                path = target_dir / f"{event_id}.bmp"
                self.write_bmp(path, frame[:, :, :3])
            return str(path)
        except Exception as exc:
            self.last_capture_error = str(exc)
            print(f"Failed to save frame: {exc}")
            return None

    def probe(self, pad, info, stage="final"):
        gst_buffer = info.get_buffer()
        if not gst_buffer:
            return Gst.PadProbeReturn.OK
        batch_meta = pyds.gst_buffer_get_nvds_batch_meta(hash(gst_buffer))
        if self.test_mode == "image-debug":
            return self.probe_image_debug(gst_buffer, batch_meta, stage)
        if self.processor_type == "generic_detection":
            return self.probe_generic(gst_buffer, batch_meta, stage)
        frame_list = batch_meta.frame_meta_list
        while frame_list is not None:
            frame_meta = pyds.NvDsFrameMeta.cast(frame_list.data)
            self.update_fps(frame_meta)
            source_id = int(frame_meta.source_id)
            stream_config = self.stream_config(source_id)
            front_class_ids = self.pgie_vehicle_class_ids or set(stream_config.get("frontVehicleClassIds", [0]))
            obj_list = frame_meta.obj_meta_list
            objects = []
            vehicle_metas = {}
            while obj_list is not None:
                obj_meta = pyds.NvDsObjectMeta.cast(obj_list.data)
                payload = self.object_payload(obj_meta, frame_meta, stage)
                objects.append(payload)
                if payload["componentId"] == 1 and payload["classId"] in front_class_ids:
                    vehicle_metas[payload["objectId"]] = obj_meta
                obj_list = obj_list.next

            lpr_results, _non_vehicles, _plates, _ocr_objects = self.build_lpr_results(objects, front_class_ids)
            for result in lpr_results:
                vehicle = result["vehicle"]
                object_id = int(vehicle["objectId"])
                obj_meta = vehicle_metas.get(object_id)
                if obj_meta is None:
                    continue
                roi_point = vehicle.get("footCenter") or vehicle["center"]
                roi_x = float(roi_point["x"])
                roi_y = float(roi_point["y"])
                rules = self.stream_rules(stream_config)
                if rules:
                    rule_zones = self.all_matching_zones(stream_config, vehicle["componentId"], vehicle["classId"], roi_x, roi_y)
                    if not rule_zones:
                        continue
                    rule_targets = self.rule_capture_targets(stream_config, source_id, object_id, vehicle["componentId"], vehicle["classId"], rule_zones)
                    if not rule_targets:
                        continue
                    capture_targets = rule_targets
                else:
                    zones = self.matching_zones(stream_config, vehicle["componentId"], vehicle["classId"], roi_x, roi_y, "lpr")
                    if not zones:
                        continue
                    capture_targets = [{"zone": zone, "rule": None, "direction": "", "cooldownSec": float(zone.get("cooldownSec") or stream_config.get("captureCooldownSec", 30))} for zone in zones]

                for target in capture_targets:
                    zone = target["zone"]
                    rule = target.get("rule")
                    cooldown_sec = float(target.get("cooldownSec") or zone.get("cooldownSec") or stream_config.get("captureCooldownSec", 30))
                    capture_key = f"{zone.get('id')}:{rule.get('id') if rule else 'default'}:{object_id}"
                    if not self.should_capture(source_id, capture_key, cooldown_sec):
                        continue

                    event_id = f"{int(time.time())}_{source_id}_{frame_meta.frame_num}_{object_id}_{zone.get('id')}_{rule.get('id') if rule else 'default'}"
                    event_id = re.sub(r"[^a-zA-Z0-9_.-]+", "-", event_id)
                    image_path = self.save_frame(gst_buffer, frame_meta, obj_meta, event_id, stream_config)
                    image_relative_path = str(Path(image_path).relative_to(self.runtime_dir)).replace("\\", "/") if image_path else None
                    plate_summaries = self.compact_plate_results(result.get("plates", []))
                    failure = self.lpr_failure(result)
                    event = {
                        "eventType": "vehicle_capture",
                        "processorType": self.processor_type,
                        "eventId": event_id,
                        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        "sourceId": source_id,
                        "cameraId": stream_config.get("id", f"camera-{source_id + 1}"),
                        "cameraName": stream_config.get("name", f"Camera {source_id + 1}"),
                        "stream": stream_config.get("rtspUrl"),
                        "zoneId": zone.get("id"),
                        "zoneName": zone.get("name"),
                        "zoneMode": zone.get("mode"),
                        "zonePolygon": zone.get("polygon") or [],
                        "ruleId": rule.get("id") if rule else None,
                        "ruleName": rule.get("name") if rule else None,
                        "ruleType": rule.get("type") if rule else None,
                        "ruleDirection": target.get("direction") if rule else None,
                        "objectId": object_id,
                        "frameNum": int(frame_meta.frame_num),
                        "frameWidth": int(frame_meta.source_frame_width),
                        "frameHeight": int(frame_meta.source_frame_height),
                        "classId": int(vehicle["classId"]),
                        "bbox": vehicle["bbox"],
                        "center": vehicle["center"],
                        "footCenter": vehicle.get("footCenter"),
                        "roiPoint": roi_point,
                        "plateText": result.get("plateText") or "UNKNOWN",
                        "plateStatus": result.get("plateStatus"),
                        "plates": plate_summaries,
                        "failedStage": failure.get("stage"),
                        "failedModel": failure.get("model"),
                        "failureReason": failure.get("reason"),
                        "imagePath": image_path,
                        "imageRelativePath": image_relative_path,
                        "imageUrl": f"/runtime/{image_relative_path}" if image_relative_path else None,
                        "imageSaveError": None if image_path else self.last_capture_error,
                    }
                    print(json.dumps(event, ensure_ascii=False))
                    self.save_event(event)
            frame_list = frame_list.next
        return Gst.PadProbeReturn.OK

    def probe_generic(self, gst_buffer, batch_meta, stage="final"):
        frame_list = batch_meta.frame_meta_list
        while frame_list is not None:
            frame_meta = pyds.NvDsFrameMeta.cast(frame_list.data)
            self.update_fps(frame_meta)
            source_id = int(frame_meta.source_id)
            stream_config = self.stream_config(source_id)
            obj_list = frame_meta.obj_meta_list
            while obj_list is not None:
                obj_meta = pyds.NvDsObjectMeta.cast(obj_list.data)
                payload = self.object_payload(obj_meta, frame_meta, stage)
                if not self.payload_selected(payload):
                    obj_list = obj_list.next
                    continue
                roi_point = payload.get("footCenter") or payload["center"]
                roi_x = float(roi_point["x"])
                roi_y = float(roi_point["y"])
                object_key = f"{payload['componentId']}:{payload['objectId']}"
                rules = self.stream_rules(stream_config)
                if rules:
                    rule_zones = self.all_matching_zones(stream_config, payload["componentId"], payload["classId"], roi_x, roi_y)
                    if not rule_zones:
                        obj_list = obj_list.next
                        continue
                    rule_targets = self.rule_capture_targets(stream_config, source_id, object_key, payload["componentId"], payload["classId"], rule_zones)
                    if not rule_targets:
                        obj_list = obj_list.next
                        continue
                    capture_targets = rule_targets
                else:
                    zones = self.matching_zones(stream_config, payload["componentId"], payload["classId"], roi_x, roi_y, "generic_detection")
                    if not zones:
                        obj_list = obj_list.next
                        continue
                    capture_targets = [{"zone": zone, "rule": None, "direction": "", "cooldownSec": float(zone.get("cooldownSec") or stream_config.get("captureCooldownSec", 30))} for zone in zones]

                for target in capture_targets:
                    zone = target["zone"]
                    rule = target.get("rule")
                    cooldown_sec = float(target.get("cooldownSec") or zone.get("cooldownSec") or stream_config.get("captureCooldownSec", 30))
                    capture_key = f"{zone.get('id')}:{rule.get('id') if rule else 'default'}:{payload['componentId']}:{payload['objectId']}"
                    if not self.should_capture(source_id, capture_key, cooldown_sec, "generic_detection"):
                        continue

                    event_id = f"{int(time.time())}_{source_id}_{frame_meta.frame_num}_{payload['componentId']}_{payload['objectId']}_{zone.get('id')}_{rule.get('id') if rule else 'default'}"
                    event_id = re.sub(r"[^a-zA-Z0-9_.-]+", "-", event_id)
                    image_path = self.save_frame(gst_buffer, frame_meta, obj_meta, event_id, stream_config)
                    image_relative_path = str(Path(image_path).relative_to(self.runtime_dir)).replace("\\", "/") if image_path else None
                    event = {
                        "eventType": "detection_capture",
                        "processorType": self.processor_type,
                        "eventId": event_id,
                        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        "cameraId": stream_config.get("id", f"camera-{source_id + 1}"),
                        "cameraName": stream_config.get("name", f"Camera {source_id + 1}"),
                        "stream": stream_config.get("rtspUrl"),
                        "zoneId": zone.get("id"),
                        "zoneName": zone.get("name"),
                        "zoneMode": zone.get("mode"),
                        "zonePolygon": zone.get("polygon") or [],
                        "ruleId": rule.get("id") if rule else None,
                        "ruleName": rule.get("name") if rule else None,
                        "ruleType": rule.get("type") if rule else None,
                        "ruleDirection": target.get("direction") if rule else None,
                        "frameWidth": int(frame_meta.source_frame_width),
                        "frameHeight": int(frame_meta.source_frame_height),
                        "roiPoint": roi_point,
                        **payload,
                        "imagePath": image_path,
                        "imageRelativePath": image_relative_path,
                        "imageUrl": f"/runtime/{image_relative_path}" if image_relative_path else None,
                        "imageSaveError": None if image_path else self.last_capture_error,
                    }
                    print(json.dumps(event, ensure_ascii=False))
                    self.save_event(event)
                obj_list = obj_list.next
            frame_list = frame_list.next
        return Gst.PadProbeReturn.OK

    def object_payload(self, obj_meta, frame_meta, stage):
        rect = obj_meta.rect_params
        component_id = int(obj_meta.unique_component_id)
        class_id = int(obj_meta.class_id)
        classifier_labels = self.extract_classifier_labels(obj_meta)
        tensor_predictions = self.extract_tensor_predictions(obj_meta)
        tensor_labels = [
            item["label"] for item in tensor_predictions
            if item.get("component") == "plate_ocr" and item.get("label")
        ]
        plate_labels = classifier_labels + tensor_labels
        return {
            "stage": stage,
            "sourceId": int(frame_meta.source_id),
            "frameNum": int(frame_meta.frame_num),
            "componentId": component_id,
            "component": self.component_name(component_id),
            "objectId": int(obj_meta.object_id),
            "parentObjectId": self.parent_object_id(obj_meta),
            "classId": class_id,
            "label": self.label_for(component_id, class_id),
            "confidence": float(obj_meta.confidence),
            "bbox": {
                "left": float(rect.left),
                "top": float(rect.top),
                "width": float(rect.width),
                "height": float(rect.height),
            },
            "center": {
                "x": float(rect.left + rect.width / 2),
                "y": float(rect.top + rect.height / 2),
            },
            "footCenter": {
                "x": float(rect.left + rect.width / 2),
                "y": float(rect.top + rect.height),
            },
            "isVehicle": self.processor_type == "lpr" and component_id == 1 and class_id in self.image_test_vehicle_ids,
            "lprRequested": self.processor_type == "lpr" and component_id == 1 and class_id in self.image_test_vehicle_ids,
            "classifierLabels": classifier_labels,
            "tensorPredictions": tensor_predictions,
            "plateText": "".join(plate_labels) if self.processor_type == "lpr" and plate_labels else "",
        }

    def image_detection_key(self, payload):
        bbox = payload["bbox"]
        return (
            payload["stage"],
            payload["frameNum"],
            payload["componentId"],
            payload["classId"],
            round(bbox["left"], 1),
            round(bbox["top"], 1),
            round(bbox["width"], 1),
            round(bbox["height"], 1),
        )

    def bbox_contains(self, outer, inner):
        x = inner["center"]["x"]
        y = inner["center"]["y"]
        box = outer["bbox"]
        return box["left"] <= x <= box["left"] + box["width"] and box["top"] <= y <= box["top"] + box["height"]

    def sorted_character_text(self, characters):
        if not characters:
            return "", []
        sorted_chars = sorted(characters, key=lambda item: item["bbox"]["top"])
        lines = []
        for char in sorted_chars:
            char_anchor = abs((char["bbox"]["top"] + char["bbox"]["height"]) - char.get("plateTop", 0.0))
            target = None
            for line in lines:
                if max(char_anchor, line["anchor"]) and min(char_anchor, line["anchor"]) / max(char_anchor, line["anchor"]) >= 0.8:
                    target = line
                    break
            if target is None:
                target = {"anchor": char_anchor, "chars": []}
                lines.append(target)
            target["chars"].append(char)
            target["anchor"] = sum(abs((item["bbox"]["top"] + item["bbox"]["height"]) - item.get("plateTop", 0.0)) for item in target["chars"]) / len(target["chars"])

        line_outputs = []
        for line in sorted(lines, key=lambda item: item["anchor"]):
            chars = sorted(line["chars"], key=lambda item: item["center"]["x"])
            text = "".join(item["label"] for item in chars)
            line_outputs.append({
                "text": text,
                "avgY": sum(item["center"]["y"] for item in chars) / len(chars),
                "chars": chars,
            })
        return "".join(line["text"] for line in line_outputs), line_outputs

    def is_valid_license_plate(self, text):
        if not text:
            return False
        plate = re.sub(r"[^0-9A-Z]", "", text.upper().replace("Đ", "D"))
        patterns = [
            r"^\d{2}[A-Z]\d{4,5}$",
            r"^\d{2}[A-Z]{2}\d{5}$",
            r"^(NG|NN)\d{5}$",
            r"^[A-Z]{2}\d{4,5}$",
        ]
        return any(re.match(pattern, plate) for pattern in patterns)

    def bbox_iou(self, a, b):
        ax1, ay1 = a["bbox"]["left"], a["bbox"]["top"]
        ax2, ay2 = ax1 + a["bbox"]["width"], ay1 + a["bbox"]["height"]
        bx1, by1 = b["bbox"]["left"], b["bbox"]["top"]
        bx2, by2 = bx1 + b["bbox"]["width"], by1 + b["bbox"]["height"]
        ix1, iy1 = max(ax1, bx1), max(ay1, by1)
        ix2, iy2 = min(ax2, bx2), min(ay2, by2)
        iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
        inter = iw * ih
        area_a = max(0.0, a["bbox"]["width"]) * max(0.0, a["bbox"]["height"])
        area_b = max(0.0, b["bbox"]["width"]) * max(0.0, b["bbox"]["height"])
        union = area_a + area_b - inter
        return inter / union if union > 0 else 0.0

    def normalize_char_confidence(self, value):
        if value is None:
            return 0.0
        value = float(value)
        if value <= 1.0:
            return value
        return value / (1.0 + value)

    def filter_plate_characters(self, plate, characters):
        settings = self.ocr_postprocess
        plate_box = plate["bbox"]
        plate_width = max(1.0, plate_box["width"])
        plate_height = max(1.0, plate_box["height"])
        filtered = []
        rejected = []
        for char in characters:
            conf = self.normalize_char_confidence(char.get("confidence"))
            width_ratio = char["bbox"]["width"] / plate_width
            height_ratio = char["bbox"]["height"] / plate_height
            reason = ""
            if not self.bbox_contains(plate, char):
                reason = "outside_plate"
            elif conf < settings["minConfidence"]:
                reason = "low_confidence"
            elif width_ratio < settings["minWidthRatio"] or width_ratio > settings["maxWidthRatio"]:
                reason = "bad_width"
            elif height_ratio < settings["minHeightRatio"] or height_ratio > settings["maxHeightRatio"]:
                reason = "bad_height"
            if reason:
                rejected.append({**char, "normalizedConfidence": conf, "rejectReason": reason})
                continue
            filtered.append({**char, "normalizedConfidence": conf, "plateTop": plate_box["top"]})

        kept = []
        for char in sorted(filtered, key=lambda item: item["normalizedConfidence"], reverse=True):
            if all(self.bbox_iou(char, item) <= settings["nmsIou"] for item in kept):
                kept.append(char)
            else:
                rejected.append({**char, "rejectReason": "nms_overlap"})
        kept = sorted(kept, key=lambda item: item["normalizedConfidence"], reverse=True)[:settings["maxChars"]]
        return kept, rejected

    def compact_plate_results(self, plates):
        compact = []
        for plate in plates:
            compact.append({
                "objectId": plate.get("objectId"),
                "parentObjectId": plate.get("parentObjectId"),
                "classId": plate.get("classId"),
                "label": plate.get("label"),
                "confidence": plate.get("confidence"),
                "bbox": plate.get("bbox"),
                "rawPlateText": plate.get("rawPlateText", ""),
                "plateText": plate.get("plateText", ""),
                "ocrStatus": plate.get("ocrStatus", ""),
                "rawCharCount": plate.get("rawCharCount", 0),
                "keptCharCount": plate.get("keptCharCount", 0),
                "rejectedCharCount": plate.get("rejectedCharCount", 0),
                "charLines": plate.get("charLines", []),
            })
        return compact

    def lpr_failure(self, result):
        if result.get("plateText"):
            return {"stage": None, "model": None, "reason": None}
        plates = result.get("plates") or []
        if not plates:
            return {
                "stage": "sgie-plate",
                "model": "plate_detector",
                "reason": "no_plate_detected",
            }
        statuses = [plate.get("ocrStatus") for plate in plates if plate.get("ocrStatus")]
        if any(status == "no_ocr_label" for status in statuses):
            reason = "no_character_detected"
        elif any(status == "invalid_plate_format" for status in statuses):
            reason = "invalid_plate_format"
        else:
            reason = statuses[0] if statuses else "ocr_failed"
        return {
            "stage": "tgie-character",
            "model": "plate_ocr",
            "reason": reason,
        }

    def build_lpr_results(self, objects, vehicle_class_ids=None):
        vehicle_class_ids = set(vehicle_class_ids or self.image_test_vehicle_ids)
        vehicles = [item for item in objects if item["componentId"] == 1 and item["classId"] in vehicle_class_ids]
        non_vehicles = [item for item in objects if item["componentId"] == 1 and item["classId"] not in vehicle_class_ids]
        plates = [item for item in objects if item["componentId"] == 2]
        ocr_objects = [item for item in objects if item["componentId"] == 3]
        results = []
        for vehicle in vehicles:
            vehicle_id = vehicle["objectId"]
            vehicle_plates = [
                plate for plate in plates
                if plate["parentObjectId"] == vehicle_id or (plate["parentObjectId"] is None and self.bbox_contains(vehicle, plate))
            ]
            plate_results = []
            for plate in vehicle_plates:
                plate_id = plate["objectId"]
                related_ocr = [
                    item for item in ocr_objects
                    if item["parentObjectId"] == plate_id or (item["parentObjectId"] is None and self.bbox_contains(plate, item))
                ]
                kept_chars, rejected_chars = self.filter_plate_characters(plate, related_ocr)
                char_text, char_lines = self.sorted_character_text(kept_chars)
                valid_plate = self.is_valid_license_plate(char_text)
                plate_results.append({
                    **plate,
                    "ocrObjects": related_ocr,
                    "charDetections": kept_chars,
                    "rawCharDetections": related_ocr,
                    "rejectedCharDetections": rejected_chars[:100],
                    "rawCharCount": len(related_ocr),
                    "keptCharCount": len(kept_chars),
                    "rejectedCharCount": len(rejected_chars),
                    "topRawCharDetections": sorted(
                        [
                            {**item, "normalizedConfidence": self.normalize_char_confidence(item.get("confidence"))}
                            for item in related_ocr
                        ],
                        key=lambda item: item["normalizedConfidence"],
                        reverse=True,
                    )[:20],
                    "charLines": char_lines,
                    "rawPlateText": char_text,
                    "plateText": char_text if valid_plate else "",
                    "ocrStatus": "success" if valid_plate else "invalid_plate_format" if char_text else "no_ocr_label",
                })
            results.append({
                "vehicle": vehicle,
                "plates": plate_results,
                "plateStatus": "success" if plate_results else "no_plate_detected",
                "plateText": " ".join([plate["plateText"] for plate in plate_results if plate["plateText"]]),
            })
        return results, non_vehicles, plates, ocr_objects

    def build_image_lpr_results(self, objects):
        return self.build_lpr_results(objects, self.image_test_vehicle_ids)

    def probe_image_debug(self, gst_buffer, batch_meta, stage):
        frame_list = batch_meta.frame_meta_list
        while frame_list is not None:
            frame_meta = pyds.NvDsFrameMeta.cast(frame_list.data)
            self.update_fps(frame_meta)
            source_id = int(frame_meta.source_id)
            stream_config = self.stream_config(source_id)
            obj_list = frame_meta.obj_meta_list
            objects = []
            while obj_list is not None:
                obj_meta = pyds.NvDsObjectMeta.cast(obj_list.data)
                payload = self.object_payload(obj_meta, frame_meta, stage)
                if self.processor_type == "generic_detection" and not self.payload_selected(payload):
                    obj_list = obj_list.next
                    continue
                objects.append(payload)
                event_key = self.image_detection_key(payload)
                if stage == "final" and event_key in self.image_debug_seen:
                    obj_list = obj_list.next
                    continue
                self.image_debug_seen.add(event_key)
                event_id = f"image_test_{stage}_{int(time.time())}_{source_id}_{frame_meta.frame_num}_{len(objects)}"
                image_path = self.save_frame(gst_buffer, frame_meta, obj_meta, event_id, stream_config)
                image_relative_path = str(Path(image_path).relative_to(self.runtime_dir)).replace("\\", "/") if image_path else None
                event = {
                    "eventType": "image_detection",
                    "eventId": event_id,
                    "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    **payload,
                    "processorType": self.processor_type,
                    "imagePath": image_path,
                    "imageRelativePath": image_relative_path,
                    "imageUrl": f"/runtime/{image_relative_path}" if image_relative_path else None,
                    "imageSaveError": None if image_path else self.last_capture_error,
                }
                print(json.dumps(event, ensure_ascii=False))
                self.save_event(event)
                obj_list = obj_list.next
            if stage == "final":
                final_key = (source_id, int(frame_meta.frame_num))
                if final_key not in self.image_debug_final_frames:
                    self.image_debug_final_frames.add(final_key)
                    counts_by_component = {}
                    for item in objects:
                        counts_by_component[item["component"]] = counts_by_component.get(item["component"], 0) + 1
                    summary_event = {
                        "eventType": "image_frame_summary",
                        "processorType": self.processor_type,
                        "stage": stage,
                        "sourceId": source_id,
                        "frameNum": int(frame_meta.frame_num),
                        "frameWidth": int(frame_meta.source_frame_width),
                        "frameHeight": int(frame_meta.source_frame_height),
                        "objectCount": len(objects),
                        "countsByComponent": counts_by_component,
                    }
                    if self.processor_type == "generic_detection":
                        summary_event["detectionCount"] = len(objects)
                        print(json.dumps(summary_event, ensure_ascii=False))
                        self.save_event(summary_event)
                        frame_list = frame_list.next
                        continue

                    lpr_results, non_vehicles, plates, ocr_objects = self.build_image_lpr_results(objects)
                    summary_event.update({
                        "vehicleCount": len(lpr_results),
                        "nonVehicleCount": len(non_vehicles),
                        "plateCount": len(plates),
                        "ocrObjectCount": len(ocr_objects),
                    })
                    print(json.dumps(summary_event, ensure_ascii=False))
                    self.save_event(summary_event)
                    for result_index, result in enumerate(lpr_results, start=1):
                        event = {
                            "eventType": "image_lpr_result",
                            "processorType": self.processor_type,
                            "eventId": f"image_lpr_{int(time.time())}_{source_id}_{frame_meta.frame_num}_{result_index}",
                            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                            "sourceId": source_id,
                            "frameNum": int(frame_meta.frame_num),
                            **result,
                        }
                        print(json.dumps(event, ensure_ascii=False))
                        self.save_event(event)
                    for item in non_vehicles:
                        event = {
                            "eventType": "image_non_vehicle_detection",
                            "processorType": self.processor_type,
                            "eventId": f"image_non_vehicle_{int(time.time())}_{source_id}_{frame_meta.frame_num}_{item['objectId']}",
                            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                            **item,
                        }
                        print(json.dumps(event, ensure_ascii=False))
                        self.save_event(event)
            frame_list = frame_list.next
        return Gst.PadProbeReturn.OK


def make_element(factory, name):
    element = Gst.ElementFactory.make(factory, name)
    if not element:
        raise RuntimeError(f"Could not create GStreamer element: {factory}")
    return element


def link_pad_to_streammux(src_pad, streammux, sink_index):
    sink_pad = streammux.request_pad_simple(f"sink_{sink_index}")
    if not sink_pad:
        raise RuntimeError("Could not get streammux sink pad")
    if src_pad.link(sink_pad) != Gst.PadLinkReturn.OK:
        raise RuntimeError("Failed to link source to streammux")


def on_decodebin_pad_added(_decodebin, pad, streammux, sink_index):
    caps = pad.get_current_caps()
    if caps and "video" not in caps.to_string():
        return
    link_pad_to_streammux(pad, streammux, sink_index)


def file_uri_path(input_uri):
    parsed = urlparse(input_uri)
    if parsed.scheme != "file":
        return None
    return Path(unquote(parsed.path))


def is_jpeg_uri(input_uri):
    path = file_uri_path(input_uri)
    return path is not None and path.suffix.lower() in {".jpg", ".jpeg"}


def create_uri_source(input_uri, index):
    source = make_element("uridecodebin", f"input-source-{index}")
    source.set_property("uri", input_uri)
    return [source], source, "dynamic"


def create_jpeg_source(input_uri, index):
    path = file_uri_path(input_uri)
    if not path:
        raise RuntimeError(f"Invalid JPEG test URI: {input_uri}")
    source = make_element("filesrc", f"jpeg-source-{index}")
    decoder = make_element("jpegdec", f"jpeg-decoder-{index}")
    convert = make_element("videoconvert", f"jpeg-convert-{index}")
    nvconvert = make_element("nvvideoconvert", f"jpeg-nvconvert-{index}")
    capsfilter = make_element("capsfilter", f"jpeg-caps-{index}")
    source.set_property("location", str(path))
    capsfilter.set_property("caps", Gst.Caps.from_string("video/x-raw(memory:NVMM),format=NV12"))
    return [source, decoder, convert, nvconvert, capsfilter], capsfilter, "static"


def model_ready(config, group):
    model = config.get("models", {}).get(group, {})
    return bool(model.get("engine") or model.get("onnx"))


def runtime_stages(config):
    stages = config.get("pipelineStages") or [
        {"id": "pgie", "name": "vehicle-front-detector", "modelGroup": "vehicle_front", "gieId": 1, "configFile": "/workspace/deepstream-lpr-app/runtime/generated/config_infer_vehicle_front.txt", "enabled": True},
        {"id": "sgie-plate", "name": "plate-detector", "modelGroup": "plate_detector", "gieId": 2, "configFile": "/workspace/deepstream-lpr-app/runtime/generated/config_infer_plate_detector.txt", "enabled": True},
        {"id": "tgie-character", "name": "plate-ocr", "modelGroup": "plate_ocr", "gieId": 3, "configFile": "/workspace/deepstream-lpr-app/runtime/generated/config_infer_plate_ocr.txt", "enabled": True},
    ]
    return [
        stage for stage in stages
        if stage.get("enabled", True) and stage.get("ready", True) and model_ready(config, stage.get("modelGroup", ""))
    ]


def build_pipeline(runtime):
    config = runtime.config
    input_uris = [item.get("rtspUrl") for item in runtime.streams if item.get("rtspUrl")]
    if not input_uris:
        raise RuntimeError("No input streams configured")
    stages = runtime_stages(config)
    if not stages:
        raise RuntimeError("No runnable inference stage is configured")
    use_tracker = runtime.test_mode != "image-debug"

    Gst.init(None)
    pipeline = Gst.Pipeline.new("deepstream-lpr-pipeline")
    source_chains = []
    for index, input_uri in enumerate(input_uris):
        source_chains.append(create_jpeg_source(input_uri, index) if is_jpeg_uri(input_uri) else create_uri_source(input_uri, index))
    streammux = make_element("nvstreammux", "streammux")
    infer_elements = []
    for index, stage in enumerate(stages):
        element = make_element("nvinfer", re.sub(r"[^a-zA-Z0-9_-]+", "-", stage.get("id", f"gie-{index + 1}")))
        element.set_property("config-file-path", str(stage.get("configFile") or runtime.runtime_dir / "generated" / f"config_infer_{stage.get('id', f'gie-{index + 1}')}.txt"))
        infer_elements.append(element)
    tracker = make_element("nvtracker", "tracker") if use_tracker else None
    conv = make_element("nvvideoconvert", "converter")
    capsfilter = make_element("capsfilter", "rgba-caps")
    osd = make_element("nvdsosd", "onscreendisplay")
    sink = make_element("fakesink", "sink")

    streammux.set_property("batch-size", len(input_uris))
    streammux.set_property("width", int(config.get("streamWidth", 1920)))
    streammux.set_property("height", int(config.get("streamHeight", 1080)))
    streammux.set_property("live-source", 1 if any(uri.lower().startswith("rtsp://") for uri in input_uris) else 0)
    streammux.set_property("batched-push-timeout", 40000)
    if tracker:
        tracker.set_property("ll-lib-file", config.get("trackerLib", "/opt/nvidia/deepstream/deepstream/lib/libnvds_nvmultiobjecttracker.so"))
        tracker.set_property("ll-config-file", str(runtime.runtime_dir / "generated" / "tracker_config.yml"))
    capsfilter.set_property("caps", Gst.Caps.from_string("video/x-raw(memory:NVMM),format=RGBA"))
    sink.set_property("sync", False)

    source_elements = [element for chain, _last, _mode in source_chains for element in chain]
    elements = [*source_elements, streammux]
    if infer_elements:
        elements.append(infer_elements[0])
    if tracker:
        elements.append(tracker)
    elements.extend(infer_elements[1:])
    elements.extend([conv, capsfilter, osd, sink])

    for element in elements:
        pipeline.add(element)
    for index, (chain, last, mode) in enumerate(source_chains):
        if len(chain) > 1:
            for left, right in zip(chain, chain[1:]):
                if not left.link(right):
                    raise RuntimeError(f"Could not link {left.name} -> {right.name}")
        if mode == "dynamic":
            chain[0].connect("pad-added", on_decodebin_pad_added, streammux, index)
        else:
            src_pad = last.get_static_pad("src")
            if not src_pad:
                raise RuntimeError(f"Could not get src pad for {last.name}")
            link_pad_to_streammux(src_pad, streammux, index)

    chain = [streammux]
    if infer_elements:
        chain.append(infer_elements[0])
    if tracker:
        chain.append(tracker)
    chain.extend(infer_elements[1:])
    chain.extend([conv, capsfilter, osd, sink])

    for left, right in zip(chain, chain[1:]):
        if not left.link(right):
            raise RuntimeError(f"Could not link {left.name} -> {right.name}")
    if runtime.test_mode == "image-debug" and infer_elements:
        infer_elements[0].get_static_pad("src").add_probe(Gst.PadProbeType.BUFFER, runtime.probe, "primary-detect")
    osd.get_static_pad("sink").add_probe(Gst.PadProbeType.BUFFER, runtime.probe)
    print(f"Pipeline mode: {len(infer_elements)} inference stage(s)")
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
    had_error = {"value": False}

    def on_message(_bus, message):
        if message.type == Gst.MessageType.ERROR:
            err, debug = message.parse_error()
            print(f"ERROR: {err}: {debug}")
            runtime.write_status("error", f"{err}: {debug}")
            had_error["value"] = True
            loop.quit()
        elif message.type == Gst.MessageType.EOS:
            runtime.write_status("eos", "Pipeline reached EOS.")
            loop.quit()

    bus.connect("message", on_message)
    result = pipeline.set_state(Gst.State.PLAYING)
    if result == Gst.StateChangeReturn.FAILURE:
        runtime.write_status("error", "Failed to set pipeline to PLAYING.")
        raise SystemExit(1)
    runtime.write_status("playing", "DeepStream pipeline started.")
    try:
        loop.run()
    finally:
        pipeline.set_state(Gst.State.NULL)
        if not had_error["value"]:
            runtime.write_status("stopped", "Pipeline stopped.")
    if had_error["value"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
