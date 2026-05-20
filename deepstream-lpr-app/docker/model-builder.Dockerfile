ARG BASE_IMAGE=ultralytics/ultralytics:latest-jetson-jetpack6
FROM ${BASE_IMAGE}

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_DEFAULT_TIMEOUT=1000 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_PROGRESS_BAR=off \
    PIP_RETRIES=20 \
    PYTHONUNBUFFERED=1

RUN printf '%s\n' \
    'Acquire::Retries "5";' \
    'Acquire::http::Timeout "60";' \
    'Acquire::https::Timeout "60";' \
    > /etc/apt/apt.conf.d/80-camera-monitor-timeouts

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    libglib2.0-0 \
    libgl1 \
    libopenblas-dev \
    python3-dev \
    python3-pip \
    python3-setuptools \
    python3-wheel \
  && rm -rf /var/lib/apt/lists/*

RUN python3 -m pip install --timeout 1000 --retries 20 --prefer-binary \
    onnx \
    onnxscript \
    onnxsim \
    onnxslim \
    ultralytics-thop

RUN python3 - <<'PY'
import importlib
required = ["torch", "ultralytics", "onnx", "onnxscript", "onnxsim", "onnxslim", "cv2"]
missing = []
for name in required:
    try:
        importlib.import_module(name)
    except Exception as exc:
        missing.append(f"{name}: {exc}")
if missing:
    raise SystemExit("Model builder image is missing required modules:\n" + "\n".join(missing))
PY

WORKDIR /workspace/deepstream-lpr-app
