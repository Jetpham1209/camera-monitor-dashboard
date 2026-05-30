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


def capture_with_cv2(source, output_path):
    import cv2

    cap = cv2.VideoCapture(source)
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


def capture_once(payload):
    config = payload.get("config") or {}
    source = str(config.get("cameraUrl") or "").strip()
    if not source:
        raise RuntimeError("cameraUrl is required.")
    camera_id = config.get("cameraId") or payload.get("instanceId") or "camera"
    output_dir = Path(config.get("outputDir") or payload.get("outputDir") or os.getcwd())
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / timestamp_name(camera_id)
    timeout_sec = int(config.get("timeoutSec") or 15)
    transport = str(config.get("rtspTransport") or "tcp").lower()

    try:
        capture_with_cv2(source, output_path)
        backend = "opencv"
    except Exception as cv_error:
        try:
          capture_with_ffmpeg(source, output_path, transport, timeout_sec)
          backend = "ffmpeg"
        except Exception as ffmpeg_error:
          raise RuntimeError(f"Capture failed. OpenCV: {cv_error}. ffmpeg: {ffmpeg_error}") from ffmpeg_error

    stat = output_path.stat()
    return {
        "ok": True,
        "backend": backend,
        "cameraId": camera_id,
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


def redis_provider(payload):
    return ((payload.get("connections") or {}).get("providers") or {}).get("redis") or {}


def channel_by_id(payload, channel_id):
    for channel in (payload.get("connections") or {}).get("channels") or []:
        if channel.get("id") == channel_id:
            return channel
    return None


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
    last_id = "$"
    if input_channel.get("type") == "stream" or bindings.get("inputMode") == "consume":
        print(json.dumps({"ok": True, "mode": "redis_stream", "channel": channel_name}, ensure_ascii=False), flush=True)
        while True:
            raw = redis_command(host, port, "XREAD", "BLOCK", "5000", "COUNT", "1", "STREAMS", channel_name, last_id, timeout=8)
            text = raw.decode("utf-8", "replace")
            if text.startswith("*0") or not text.strip():
                continue
            # Minimal RESP parsing is intentionally avoided here; the captured frame is triggered by any message.
            ids = re.findall(r"\$([0-9]+)\r\n([0-9]+-[0-9]+)", text)
            if ids:
                last_id = ids[-1][1]
            result = capture_once({**payload, "event": {"trigger": "redis_stream", "channel": channel_name, "raw": text[-1000:]}})
            publish_result(payload, result)
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
    config = payload.get("config") or {}
    interval = max(1, int(config.get("captureIntervalSec") or 5))

    if args.loop:
        if run_loop_with_redis(payload):
            return
        while True:
            result = capture_once(payload)
            publish_result(payload, result)
            print(json.dumps(result, ensure_ascii=False), flush=True)
            time.sleep(interval)
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
