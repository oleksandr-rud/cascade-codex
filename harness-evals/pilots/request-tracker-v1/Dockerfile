FROM node@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2
RUN apk add --no-cache bash git python3 ripgrep curl tini \
    && npm install --global @openai/codex@0.154.0 bun@1.3.3 \
    && codex --version && bun --version
USER node
RUN npm cache add bun@1.3.3
WORKDIR /workspace
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sleep", "infinity"]
