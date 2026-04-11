# Plans

## Milestones
1. Bootstrap durable memory from current repo truth.
2. Keep durable memory current during future feature, bug, release, and documentation work.

## Acceptance Checks
- Repo structure is captured accurately: Expo mobile app, Next.js web app, shared packages, npm wrapper, and deploy helpers.
- Commands match the current scripts in root and workspace `package.json` files.
- Architecture notes reflect the current transport shape: protocol, bridge, control plane, Cloudflare worker, legacy relay, and npm installer.
- Near-term emphasis on UX and product polish is recorded without narrowing the memory to one active initiative.

## Validation
- Verify `docs/` contains the four required files.
- Cross-check memory content against `README.md`, `AGENTS.md`, root `package.json`, and workspace manifests.
- Prefer observed repo facts over assumptions. Mark unknowns explicitly.

## Decisions
- This memory is a repo baseline, not a feature-specific plan.
- Future tasks should specialize this memory by updating it, not by replacing it.
- UX and product polish are the current emphasis, but infra and distribution remain in scope for future work.

## Architecture
- `apps/mobile`: Expo React Native client.
- `apps/web`: Next.js App Router site and web UI.
- `packages/protocol`: shared protocol and crypto primitives.
- `packages/bridge`: local bridge runtime and CLI.
- `packages/control-plane`: local control-plane package.
- `packages/control-plane-worker`: Cloudflare Workers remote control plane.
- `packages/relay`: legacy relay kept for local development and compatibility tests.
- `packages/npm`: public npm installer package for the bridge runtime.
