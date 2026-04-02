# Public Relay Deploy

This folder is the simplest production path for Offdex remote access on a normal VM.

## What You Need

- a Linux VM with Docker and Docker Compose
- a domain or subdomain pointed at that VM

## Files

- `compose.yaml`: runs the relay and Caddy
- `Caddyfile.example`: HTTPS reverse proxy template

## Bring It Up

1. Copy `Caddyfile.example` to `Caddyfile`
2. Replace `relay.example.com` with your real domain
3. From this folder, run:

```bash
docker compose up -d --build
```

4. Start your bridge with:

```bash
OFFDEX_RELAY_URL=https://relay.example.com bun run dev:bridge
```

5. Scan the QR from Offdex once

After that, the same phone should keep reconnecting over the public relay until the user disconnects it.
