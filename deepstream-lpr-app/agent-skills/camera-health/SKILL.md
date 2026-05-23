# Camera Health
description: Inspect camera, source, FPS, container and DeepStream health.
triggers: camera, fps, offline, online, loi, status, health, container, deepstream, rtsp, stream

Use this skill when the user asks whether cameras or DeepStream are running, why captures are missing, or how FPS looks.

Rules:
- Start with `get_app_snapshot` for configuration questions.
- Use `get_deepstream_health` when the user asks about runtime health, FPS, missing captures, or container status.
- Use `get_deepstream_logs` when the user asks for errors, warnings, parser failures, TensorRT issues, or crash reasons.
- Keep remediation steps concrete: name the dashboard section or button the user should use.
- Do not expose RTSP passwords or tokens in the answer.
