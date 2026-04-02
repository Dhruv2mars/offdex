# Offdex Relay

Stateful websocket relay for trusted Offdex remote access.

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

- put the relay behind HTTPS so the public URL is `https://relay.your-domain.com`
- set `OFFDEX_RELAY_URL=https://relay.your-domain.com` when starting the bridge
- once the bridge restarts, the pairing QR and pairing link will embed the public relay URL
- the phone only needs to pair once, then it keeps reconnecting until the user disconnects
