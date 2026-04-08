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
bun run dev:control-plane-worker
bun run dev:bridge
bun run dev:web
bun run dev:mobile
```

## Install

The intended public Mac, Linux, and Windows install path is:

```bash
npm install -g @dhruv2mars/offdex
offdex
```

The npm package downloads the matching native bridge runtime for the current platform from GitHub Releases.

CLI usage:

```bash
offdex
offdex help
offdex start --host 0.0.0.0 --port 42420
offdex status
offdex stop
```

Remote pairing is enabled by default through the free Cloudflare Worker relay. For local development only, override it with `OFFDEX_CONTROL_PLANE_URL`.

## Deploy

### Web

The landing page is live at [offdexapp.vercel.app](https://offdexapp.vercel.app).
The browser Codex client is live at [offdexapp.vercel.app/webui](https://offdexapp.vercel.app/webui).

### Android APK

Public Android downloads are meant to ship through GitHub Releases.

- Website download link: `https://github.com/Dhruv2mars/offdex/releases/latest/download/offdex-android.apk`
- Releases page: `https://github.com/Dhruv2mars/offdex/releases`
- Create a release tag: `bun run release:tag`

Version tag releases build a signed Android APK from the Expo app and upload:

- `offdex-android.apk`
- `offdex-android.sha256`

Required GitHub repository secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

The workflow derives `versionCode` from the semver tag and enforces that:

- `apps/mobile/package.json` version matches the tag
- `apps/mobile/app.json` version matches `apps/mobile/package.json`
- `packages/npm/package.json` version matches `apps/mobile/package.json`

### npm CLI

The same release tag also publishes:

- npm package: `@dhruv2mars/offdex`
- GitHub release binaries for macOS, Linux, and Windows

Current npm target matrix:

- macOS: `arm64`, `x64`
- Linux: `arm64`, `x64`
- Windows: `x64`

The npm installer pulls the correct release asset for the current platform when users run:

```bash
npm install -g @dhruv2mars/offdex
```

Local npm package smoke check:

```bash
bun run test:install-smoke
```

Windows `arm64` is not shipped yet because Bun does not currently support compiling that target.

If you want GitHub Actions to sign Android builds automatically, the repo needs these secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

If you want the tag workflow to publish npm automatically, pick one:

- npm trusted publisher for `Dhruv2mars/offdex`
- `NPM_TOKEN` GitHub secret

### Managed Remote

```bash
offdex start
```

The QR and WebUI link embed a managed claim for that machine. Clients try the local bridge first, then fall back to the encrypted Cloudflare relay when local access is unavailable.

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
- local bridge first when reachable
- encrypted Cloudflare relay for away-from-home access
- relay room token derived from the machine secret, so random clients cannot attach to a room

## Status

Offdex now has a real path: phone or web app -> local bridge or encrypted remote relay -> Codex CLI.
