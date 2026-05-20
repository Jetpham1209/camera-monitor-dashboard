ARG BASE_IMAGE=nvcr.io/nvidia/deepstream:7.0-triton-multiarch
FROM ${BASE_IMAGE}

ARG PYDS_WHEEL_URL=https://github.com/NVIDIA-AI-IOT/deepstream_python_apps/releases/download/v1.1.11/pyds-1.1.11-py3-none-linux_aarch64.whl
ARG CUDA_VER=12.2
ARG DEEPSTREAM_VERSION=7.0

LABEL org.opencontainers.image.title="Camera Monitor DeepStream LPR Runtime" \
      org.opencontainers.image.description="DeepStream runtime with Python bindings for the camera monitor LPR app" \
      com.camera-monitor.deepstream.version="${DEEPSTREAM_VERSION}" \
      com.camera-monitor.cuda.version="${CUDA_VER}"

ENV DEBIAN_FRONTEND=noninteractive \
    CUDA_VER=${CUDA_VER} \
    DEEPSTREAM_VERSION=${DEEPSTREAM_VERSION} \
    GST_PLUGIN_PATH=/opt/nvidia/deepstream/deepstream/lib/gst-plugins:/opt/nvidia/deepstream/deepstream-7.1/lib/gst-plugins:/opt/nvidia/deepstream/deepstream-7.0/lib/gst-plugins:/opt/nvidia/deepstream/deepstream-6.4/lib/gst-plugins \
    LD_LIBRARY_PATH=/usr/lib/aarch64-linux-gnu/nvidia:/opt/nvidia/deepstream/deepstream/lib:/opt/nvidia/deepstream/deepstream-7.1/lib:/opt/nvidia/deepstream/deepstream-7.0/lib:/opt/nvidia/deepstream/deepstream-6.4/lib:/opt/tritonserver/lib:/usr/local/cuda/lib64:/usr/local/cuda-12.6/lib64:/usr/local/cuda-12.2/lib64 \
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
    ca-certificates \
    gir1.2-gst-plugins-base-1.0 \
    gir1.2-gstreamer-1.0 \
    libcairo2 \
    ffmpeg \
    gstreamer1.0-libav \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-ugly \
    libgirepository-1.0-1 \
    libopencv-dev \
    libmpg123-0 \
    libmpeg2-4 \
    libcairo2-dev \
    python3-dev \
    python3-gi \
    python3-gst-1.0 \
    python3-opencv \
    python3-pip \
    python3-setuptools \
    python3-wheel \
  && rm -rf /var/lib/apt/lists/*

RUN if [ -x "/opt/nvidia/deepstream/deepstream-${DEEPSTREAM_VERSION}/user_additional_install.sh" ]; then \
      "/opt/nvidia/deepstream/deepstream-${DEEPSTREAM_VERSION}/user_additional_install.sh"; \
    elif [ -x "/opt/nvidia/deepstream/deepstream/user_additional_install.sh" ]; then \
      "/opt/nvidia/deepstream/deepstream/user_additional_install.sh"; \
    fi

RUN python3 -m pip install --timeout 1000 --retries 20 --no-cache-dir numpy==1.26.0 \
  && python3 -m pip install --timeout 1000 --retries 20 --no-cache-dir --no-deps "${PYDS_WHEEL_URL}"

RUN printf "%s\n" \
    /usr/lib/aarch64-linux-gnu/nvidia \
    /opt/nvidia/deepstream/deepstream/lib \
    /opt/nvidia/deepstream/deepstream-7.1/lib \
    /opt/nvidia/deepstream/deepstream-7.0/lib \
    /opt/nvidia/deepstream/deepstream-6.4/lib \
    /opt/tritonserver/lib \
    /usr/local/cuda/lib64 \
    /usr/local/cuda-12.6/lib64 \
    /usr/local/cuda-12.2/lib64 \
    > /etc/ld.so.conf.d/nvidia-deepstream.conf \
  && ldconfig

RUN GST_PLUGIN_PATH= python3 - <<'PY'
import gi
gi.require_version("Gst", "1.0")
from gi.repository import Gst
Gst.init(None)
print("GStreamer Python runtime OK")
PY

RUN python3 - <<'PY'
import cv2
import numpy
print("OpenCV runtime OK", cv2.__version__)
print("numpy runtime OK", numpy.__version__)
PY

RUN rm -rf /root/.cache/gstreamer-1.0

WORKDIR /workspace/deepstream-lpr-app
