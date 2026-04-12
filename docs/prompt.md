# Prompt

## Task
- Continue pushing Offdex toward Codex Desktop parity with a strict bridge-first architecture.
- Keep the bridge and protocol as the product core.
- Keep webUI thin: it should render bridge state and bridge capabilities, not invent its own product semantics.
- Ensure new semantics can be reused by mobile with minimal UI-only adaptation.
- Maintain durable project memory in `docs/` and use it as the source of truth while this work continues.

## Goals
- Normalize more desktop-like capabilities into shared bridge/protocol contracts before adding UI-only behavior.
- Improve the web workbench UX in ways that are directly backed by shared runtime state.
- Preserve or improve mobile compatibility every time the thread, review, diff, approval, runtime, or inventory models evolve.
- Keep local verification tight: typecheck, targeted tests, and browser smoke for visible web changes.

## Non-Goals
- Do not turn the web app into a browser-only product with duplicated business logic.
- Do not push desktop-only visual patterns into protocol or bridge layers.
- Do not broaden scope into unrelated infra or release work unless required by the parity task.
- Do not claim desktop parity until core review, runtime, remote/workspace, and tool/result workflows are honestly comparable.

## Constraints
- Bun-first commands and Turborepo workspace conventions.
- `DESIGN.md` remains the frontend design authority unless the user overrides it.
- Bridge-first rule: shared semantics belong in `packages/protocol` and `packages/bridge` before client-specific rendering.
- Web and mobile clients may differ in layout and interaction, but should consume the same underlying capability model.
- Keep durable memory current before and after substantial work.

## Deliverables
- Updated durable memory files in `docs/`.
- Verified bridge/protocol improvements that advance desktop-parity work.
- Verified webUI changes that consume those shared capabilities.
- Mobile compatibility maintained for any shared-contract changes.

## Done When
- `docs/prompt.md`, `docs/plans.md`, `docs/implement.md`, and `docs/documentation.md` reflect the current parity effort instead of the old generic repo baseline.
- New work continues from those docs instead of relying on chat history.
- Every new parity slice is bridge-first where appropriate, verified, and recorded in `docs/documentation.md`.
