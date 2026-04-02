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
bun run dev:control-plane
bun run dev:bridge
bun run dev:web
bun run dev:mobile
```

For the managed remote path, run the bridge against the control plane:

```bash
OFFDEX_CONTROL_PLANE_URL=http://127.0.0.1:42421 bun run dev:bridge
```

Then scan the QR once in Offdex. The phone claims a trusted device session, sees the machine list for that owner, and keeps reconnecting until you explicitly disconnect it in the app.

## Deploy

### Web

The web app is live at [web-dhruv2mars.vercel.app](https://web-dhruv2mars.vercel.app).

### Managed Remote

```bash
OFFDEX_CONTROL_PLANE_URL=https://control.example.com bun run dev:bridge
```

Once the bridge restarts, the QR and pairing link will embed a managed claim for that machine. Direct bridge access is attempted first; encrypted relay fallback stays behind the control plane.

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
- trusted device session saved on phone until disconnect
- direct bridge tickets are short-lived and verified by the machine
- encrypted relay fallback for away-from-home access
- relay room token derived from the machine secret, so random clients cannot attach to a room

## Status

Offdex now has a real path: phone or web app -> local bridge -> Codex CLI, with managed remote brokering for trusted phones and relay fallback hidden behind the control plane.
