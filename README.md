# Offdex

**Offdex: Codex mobile app.**

Offdex is a public monorepo for a fast, polished, local-first Codex experience across phone and web.

## Current Stack

- `apps/mobile`: Expo + React Native
- `apps/web`: Next.js App Router
- Bun workspaces
- Turborepo task orchestration

## Priorities

- UX first
- performance first
- cross-platform by default
- native modules where they earn their keep
- no paywalls

## Run

```bash
bun install
bun run dev:relay
bun run dev:bridge
bun run dev:web
bun run dev:mobile
```

For local relay development, run the bridge with a relay URL:

```bash
OFFDEX_RELAY_URL=ws://127.0.0.1:42421 bun run dev:bridge
```

Then scan the QR once in Offdex. The phone stores that trusted pairing and will keep reconnecting until you explicitly disconnect it in the app.

## Deploy

### Web

The web app is live at [web-dhruv2mars.vercel.app](https://web-dhruv2mars.vercel.app).

### Public Relay

For real away-from-home access, deploy the relay on a long-lived host with HTTPS or WSS. The repo now includes a container path in [deploy/relay/README.md](/Users/dhruv2mars/dev/github/offdex/deploy/relay/README.md).

Use a public URL like:

```bash
OFFDEX_RELAY_URL=https://relay.example.com bun run dev:bridge
```

Once the bridge restarts, the QR and pairing link will embed that public relay automatically.

## Repo Shape

```text
apps/
  mobile/   Expo client
  web/      Landing page now, broader web surface later
packages/   Shared protocol, bridge, relay, UI, native modules
```

## Secure Pairing

- QR code in the browser and terminal
- pairing link saved on device until disconnect
- encrypted relay path for away-from-home access
- relay room token derived from the pairing secret, so random clients cannot attach to a room

## Status

Offdex now has a real path: phone or web app -> local bridge -> Codex CLI, with optional secure relay for remote access.
