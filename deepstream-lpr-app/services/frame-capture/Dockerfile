FROM ubuntu:22.04

WORKDIR /service
ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    ffmpeg \
    python3 \
    python3-opencv \
  && rm -rf /var/lib/apt/lists/*

COPY worker.py /service/worker.py
CMD ["python3", "worker.py", "--once"]
