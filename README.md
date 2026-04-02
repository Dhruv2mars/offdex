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

## Install

The intended public Mac, Linux, and Windows install path is:

```bash
npm install -g @dhruv2mars/offdex
offdex
```

The npm package downloads the matching native bridge runtime for the current platform from GitHub Releases.

CLI usage:

```bash
offdex bridge --host 0.0.0.0 --port 42420
offdex bridge --control-plane-url https://control.example.com
offdex --help
```

For the managed remote path, run the bridge against the control plane:

```bash
OFFDEX_CONTROL_PLANE_URL=http://127.0.0.1:42421 bun run dev:bridge
```

Then scan the QR once in Offdex. The phone claims a trusted device session, sees the machine list for that owner, and keeps reconnecting until you explicitly disconnect it in the app.

## Deploy

### Web

The web app is live at [web-dhruv2mars.vercel.app](https://web-dhruv2mars.vercel.app).

### Android APK

Public Android downloads are meant to ship through GitHub Releases.

- Website download link: `https://github.com/Dhruv2mars/offdex/releases/latest/download/offdex-android.apk`
- Releases page: `https://github.com/Dhruv2mars/offdex/releases`
- Create a release tag: `bun run release:tag`

The release workflow builds a signed Android APK from the Expo app and uploads:

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
