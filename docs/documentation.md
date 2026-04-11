# Documentation

## Current Status
- Durable memory has been initialized for the Offdex monorepo.
- Offdex is a Bun workspace managed with Turborepo.
- Primary product surfaces are the Expo mobile app in `apps/mobile` and the Next.js web app in `apps/web`.
- Shared packages currently include protocol, bridge, control plane, control-plane worker, relay, and npm installer packaging.
- The repo has a public install path through `@dhruv2mars/offdex`.
- Production remote access is documented around `packages/control-plane-worker`; `packages/relay` remains for compatibility and local transport testing.

## Completed Work
- Established the durable-memory file set in `docs/`.
- Captured repo shape, commands, architecture, constraints, and maintenance rules.
- Chose a repo-baseline memory structure with near-term UX and product-polish emphasis.

## Validation Results
- Source material for initialization: `AGENTS.md`, `README.md`, root `package.json`, and workspace manifests.
- Confirmed there was no pre-existing `docs/` directory before initialization.
- Confirmed root scripts include `dev`, `build`, `test`, `typecheck`, `lint`, and package-specific dev entrypoints.

## Decisions
- `docs/prompt.md` and `docs/plans.md` are the working source of truth for future repo tasks.
- The initial memory stays generic and reusable across product, infra, and release work.
- Unknown live operational state should be marked unknown unless verified from repo artifacts or explicit user input.

## Next Steps
- Keep the memory current as future tasks change scope, architecture, validation status, or priorities.
- Bias near-term work toward UX quality, performance, and cross-platform polish unless the user redirects scope.

## Follow-Ups
- Add task-specific milestones to `plans.md` when a concrete implementation effort begins.
- Expand validation notes in this file as real work is completed and verified.
