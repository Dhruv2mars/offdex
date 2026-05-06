# Repository Guidelines

## Project Structure & Module Organization

Offdex is a Bun workspace managed with Turborepo. App code lives in `apps/`: `apps/mobile` is the Expo React Native client, and `apps/web` is the Next.js App Router site and web UI. Shared packages live in `packages/`: `protocol`, `bridge`, `relay`, `control-plane`, `control-plane-worker`, and the public npm wrapper in `packages/npm`. Tests sit beside each workspace in `test/` directories. Mobile assets are in `apps/mobile/assets`, native Expo module code is in `apps/mobile/modules`, and deployment helpers are in `deploy/`.

## Build, Test, and Development Commands

Use Bun unless a package script explicitly uses Node.

- `bun install`: install workspace dependencies and run local patch scripts.
- `bun run dev`: start all persistent dev tasks through Turbo.
- `bun run dev:web`, `bun run dev:mobile`, `bun run dev:bridge`: run one workspace.
- `bun run build`: run workspace builds and type-only package builds.
- `bun run test`: run all package and app tests.
- `bun run typecheck`: run TypeScript checks across the monorepo.
- `bun run lint`: run configured lint tasks.
- `bun run test:install-smoke`: smoke-test the npm installer package.

## Coding Style & Naming Conventions

Write TypeScript for app and package source. Follow existing formatting: two-space JSON indentation, lowercase kebab-case filenames such as `bridge-client.ts`, and PascalCase React components only where component exports require it. Prefer workspace imports like `@offdex/protocol` over relative cross-package paths. Keep environment-specific values behind documented `OFFDEX_*` variables.

## Testing Guidelines

Most workspaces use `bun test`; `packages/npm` uses Node's built-in test runner. Name tests `*.test.ts` or `*.test.js` and place them in the nearest `test/` directory. Add tests for protocol, pairing, CLI, installer, and routing behavior before changing implementation. After fixes, run the targeted workspace test and then `bun run test` when practical.

## Commit & Pull Request Guidelines

History uses short conventional commits, especially `feat:`, `fix:`, `test:`, and `chore:`. Keep commits atomic and scoped to one behavior. Pull requests should describe the change, list verification commands, link any related issue, and include screenshots or recordings for visible web or mobile UI changes.

## Security & Configuration Tips

Do not commit `.env*`, native build folders, `dist/`, `.next/`, or logs; these are ignored already. Treat release secrets, npm tokens, Android keystores, and relay URLs as private configuration. For local remote-pairing tests, prefer `OFFDEX_CONTROL_PLANE_URL` overrides instead of hardcoding endpoints.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for this repo using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

This repo uses the default engineering-skill triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain documentation layout. See `docs/agents/domain.md`.
