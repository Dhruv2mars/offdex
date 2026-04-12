# Documentation

## Current Status
- Durable memory is active and now aligned with the current task: bridge-first Codex Desktop parity work.
- `main` currently includes:
  - the browser workbench shell
  - typed runtime timeline activity
  - file-aware diff review cards
  - tighter review/workbench navigation
  - bridge-backed review-thread metadata
  - shared thread summary and attention metadata
- The bridge remains the product core. Web is being treated as a GUI layer over bridge/protocol state, with mobile kept compatible as shared contracts evolve.

## Recent Verified Work
- Added typed timeline items for task lifecycle, tool/search/file activity, and token usage.
- Upgraded diff rendering from a raw unified blob to file-aware review cards.
- Improved workbench UX in web:
  - review-session affordances
  - richer thread metrics
  - better search/history panels
  - explicit snapshot/inventory reconnect controls
- Moved review-thread linkage into shared thread metadata:
  - `threadKind`
  - `sourceThreadId`
  - `reviewThreadId`
- Added shared thread summary metadata:
  - content counts
  - latest assistant preview
  - pending approval count
  - active permission review count
  - failed-turn count
- Updated both bridge mutation paths and protocol snapshot-store mutation paths so summaries stay current.
- Updated web and mobile thread rows to consume shared summary state instead of re-deriving previews and urgency locally.

## Validation Results
- Repeatedly verified with:
  - `bun run typecheck`
  - `bun test apps/web/test/design-system.test.ts apps/web/test/webui-diff.test.ts packages/bridge/test/codex-app-server.test.ts packages/protocol/test/index.test.ts apps/mobile/test/bridge-workspace-controller.test.ts`
- Verified `/webui` loads locally with `agent-browser` after visible web changes.
- Generator-only `apps/web/next-env.d.ts` churn was intentionally excluded from commits.

## Decisions
- Shared semantics belong below the UI:
  - thread/review relationships
  - runtime event normalization
  - thread summary and attention state
  - inventory/config semantics
  - approval/review state
- Client-specific concerns stay in the client:
  - layout
  - navigation
  - visual presentation
  - mobile/web interaction details
- New parity work should continue to reduce web-only local state when that state is actually product semantics.

## Remaining Gaps
- Review findings still need more explicit shared modeling instead of relying mainly on generic timeline content and diff views.
- Remote/workspace/worktree semantics are still thinner than desktop.
- Active-session tool/result fidelity is improved but not yet desktop-complete.
- State recovery and deeper “daily driver” polish still trail desktop.

## Next Steps
- Next bridge-first slice: deepen remote/workspace/worktree semantics and thread recovery so the shared model carries more of the desktop session context.
- Extend toward explicit review findings/review summary semantics only if the runtime exposes a stable shape for them.
- Keep reducing client-only inference where the underlying behavior is clearly product semantics.

## Repo Facts Kept in Scope
- Bun workspace managed by Turborepo.
- Main product surfaces:
  - `apps/web`
  - `apps/mobile`
- Shared product core:
  - `packages/protocol`
  - `packages/bridge`
- Supporting packages still relevant:
  - `packages/control-plane`
  - `packages/control-plane-worker`
  - `packages/relay`
  - `packages/npm`
