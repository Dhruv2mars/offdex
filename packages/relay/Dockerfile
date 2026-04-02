FROM oven/bun:1.3.5

WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY packages/protocol/package.json ./packages/protocol/package.json
COPY packages/relay/package.json ./packages/relay/package.json
COPY packages/bridge/package.json ./packages/bridge/package.json

RUN bun install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
ENV OFFDEX_RELAY_HOST=0.0.0.0
ENV OFFDEX_RELAY_PORT=42421

EXPOSE 42421

CMD ["bun", "run", "./packages/relay/src/cli.ts"]
