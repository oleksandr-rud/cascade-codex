FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install --global @openai/codex@0.153.4 && codex --version
ENV CODEX_HOME=/codex-home
WORKDIR /work
