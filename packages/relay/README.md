# Offdex Legacy Relay

Stateful websocket relay used for local development and migration tests.

Production remote access now uses `packages/control-plane-worker`, which runs on Cloudflare Workers + Durable Objects. Users should not set up this relay themselves.

## What It Does

- keeps the bridge reachable away from home
- forwards encrypted proxy requests to the bridge
- forwards encrypted live workspace snapshots back to the phone
- gates each room with a token derived from the pairing secret

## Run Locally

```bash
bun run ./packages/relay/src/cli.ts
```

By default the relay listens on `0.0.0.0:42421`.

## Run In Docker

Build from the repo root:

```bash
docker build -f packages/relay/Dockerfile -t offdex-relay .
docker run --rm -p 42421:42421 offdex-relay
```

## Production Notes

- do not expose this package as the default user-facing remote path
- use the Cloudflare control-plane worker for production remote pairing
- keep this package available for compatibility and local transport tests
