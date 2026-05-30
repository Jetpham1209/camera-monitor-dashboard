FROM docker:27-cli AS docker-cli

FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    NODE_PATH=/opt/app/node_modules

WORKDIR /opt/app

RUN printf '%s\n' \
    'Acquire::Retries "5";' \
    'Acquire::http::Timeout "60";' \
    'Acquire::https::Timeout "60";' \
    > /etc/apt/apt.conf.d/80-camera-monitor-timeouts

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    ffmpeg \
    git \
    iputils-ping \
    python3 \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker-cli /usr/local/libexec/docker/cli-plugins/docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose

EXPOSE 5190

CMD ["node", "deepstream-lpr-app/control-server/server.js"]
