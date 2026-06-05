FROM ubuntu:22.04

WORKDIR /service
ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    ffmpeg \
    python3 \
    python3-opencv \
    python3-pip \
  && python3 -m pip install --no-cache-dir requests kafka-python \
  && rm -rf /var/lib/apt/lists/*

COPY worker.py /service/worker.py
CMD ["python3", "/service/worker.py", "--once"]
