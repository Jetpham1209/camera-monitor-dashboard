# Model Build Debug
description: Diagnose DeepStream model build, parser, TensorRT and label file problems.
triggers: model, build, engine, onnx, tensorrt, trtexec, parser, label, labels, deepstream-yolo, yolo

Use this skill when the user asks about model build failures, engine mismatch, DeepStream-Yolo parser behavior, or model labels.

Rules:
- Use `get_model_library` before reasoning about available models or build state.
- Use `get_deepstream_logs` for runtime model load errors.
- Explain TensorRT engine portability clearly: engine files are tied to GPU, TensorRT, CUDA, JetPack and DeepStream versions.
- If labels are missing, tell the user to upload or regenerate `labels.txt` for that model artifact.
- If a YOLO variant is involved, mention that detector, face, seg and pose models may need different DeepStream-Yolo exporters/parsers.
