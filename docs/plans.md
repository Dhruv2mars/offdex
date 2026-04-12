# Plans

## Milestones
1. Refresh durable memory to reflect the active bridge-first desktop-parity effort.
2. Continue promoting desktop-like semantics into shared contracts:
   - thread/review metadata
   - runtime activity/timeline normalization
   - review/diff semantics
   - approvals, inventory, runtime controls
3. Keep webUI thin by consuming those contracts instead of inventing parallel client state.
4. Preserve mobile compatibility for each shared-model change.
5. Continue iterating on the highest-friction remaining parity gaps:
   - review findings UX
   - remote/workspace/worktree semantics
   - richer active-session tool/result fidelity
   - stronger recovery/state continuity

## Current Completed Work
- Durable memory initialized in `docs/`.
- Web workbench shell established on `main`.
- Runtime timeline now has typed task/tool/file/search/usage rows instead of broad `unknown` fallback.
- Diff panel upgraded into file-aware review cards.
- Review-thread linkage moved into bridge/protocol-backed thread metadata instead of web-local React state.
- Mobile constructors and tests updated to the same thread contract.
- Shared thread summaries now come from protocol/bridge instead of web-local counting:
  - message, command, tool, reasoning, and diff counts
  - latest assistant preview
  - pending approval, active permission review, and failed-turn attention counts
- Web and mobile thread rows now consume those shared summaries for previews and urgency indicators.

## Next Working Slice
- Push deeper into shared workspace semantics:
  - repo/worktree/remotes context
  - stronger thread/workspace recovery continuity
  - runtime-owned review context where the app-server exposes a stable shape
- Do not invent synthetic review findings in the client if the runtime still does not expose them cleanly.

## Acceptance Checks
- Durable memory matches the active task and current repo reality.
- New parity work is bridge-first where semantics are shareable.
- WebUI changes use shared state from the bridge/protocol layer.
- Mobile typecheck and tests stay green after shared-model changes.
- No generator-only or unrelated diffs are included in commits.

## Validation
- `bun run typecheck`
- `bun test apps/web/test/design-system.test.ts apps/web/test/webui-diff.test.ts packages/bridge/test/codex-app-server.test.ts packages/protocol/test/index.test.ts apps/mobile/test/bridge-workspace-controller.test.ts`
- For visible web changes: local `next dev` plus `agent-browser` load/snapshot of `/webui`

## Decisions
- The bridge is the product core; clients are shells over that core.
- Review-thread relationships are shared model state, not web-only state.
- Thread summaries and thread attention state are also shared model state, not web-only derivation.
- Layout, navigation, and visual affordances stay client-specific.
- Desktop parity should be assessed on actual user experience, not just surface-area count.

## Architecture Notes
- `packages/protocol` owns shared types and snapshot shape.
- `packages/bridge` owns Codex runtime adaptation, snapshot refresh, and normalization of runtime events.
- `apps/web` renders the workbench and should prefer protocol-driven state over local derivation when that state is reusable.
- `apps/mobile` should be able to reuse thread/review/runtime semantics with native UI-specific rendering layered on top.

## Risks
- Web-only shortcuts can accidentally become product semantics if not pushed down into bridge/protocol.
- Shared type changes can silently break mobile or tests if constructors are not updated together.
- Diff/review UX can drift from runtime truth if the UI infers too much from freeform message text.
- Shared summary data can go stale if bridge and local snapshot-store mutation paths do not recompute it together.
