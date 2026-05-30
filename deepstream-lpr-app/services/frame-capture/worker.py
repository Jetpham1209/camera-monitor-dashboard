#!/usr/bin/env python3
import argparse
import json
import os
import re
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
        "path": str(output_path),
        "fileName": output_path.name,
        "size": stat.st_size,
        "capturedAt": datetime.now(timezone.utc).isoformat()
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="Capture one frame and exit.")
    parser.add_argument("--loop", action="store_true", help="Capture frames until stopped.")
    args = parser.parse_args()
    payload = load_payload()
    config = payload.get("config") or {}
    interval = max(1, int(config.get("captureIntervalSec") or 5))

    if args.loop:
        while True:
            result = capture_once(payload)
            print(json.dumps(result, ensure_ascii=False), flush=True)
            time.sleep(interval)
    else:
        print(json.dumps(capture_once(payload), ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
