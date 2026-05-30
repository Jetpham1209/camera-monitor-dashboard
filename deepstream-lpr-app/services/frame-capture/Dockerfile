FROM python:3.10-slim

WORKDIR /service
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY worker.py /service/worker.py
CMD ["python3", "worker.py", "--once"]
