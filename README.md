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

For remote access, run the bridge with a relay URL:

```bash
OFFDEX_RELAY_URL=wss://your-relay.example.com bun run dev:bridge
```

Then scan the QR once in Offdex. The phone stores that trusted pairing and will keep reconnecting until you explicitly disconnect it in the app.

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
