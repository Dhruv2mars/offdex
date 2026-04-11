# Prompt

## Task
- Create and maintain durable working memory for the Offdex monorepo so future work can rely on `docs/` instead of chat history.

## Goals
- Capture the stable repo shape, major subsystems, and primary product surfaces.
- Record the canonical dev, build, test, and release-adjacent commands that already exist.
- Keep near-term context biased toward UX and product polish without making the memory feature-specific.
- Define concrete completion criteria for future tasks that use this memory.

## Non-Goals
- Do not redesign the product or rewrite existing repo docs.
- Do not invent roadmap items, operational status, or undocumented architecture.
- Do not treat this baseline memory as a single-feature implementation plan.

## Constraints
- Use Bun-first commands and Turborepo workspace conventions.
- Treat `DESIGN.md` as the design authority for future frontend work unless the user overrides it.
- Keep memory concise and update it as scope or status changes.
- Treat `docs/prompt.md` and `docs/plans.md` as the source of truth for future project work in this repo.

## Deliverables
- `docs/prompt.md`
- `docs/plans.md`
- `docs/implement.md`
- `docs/documentation.md`

## Done When
- All four durable-memory files exist in `docs/`.
- They match current repo facts from `README.md`, `AGENTS.md`, and workspace manifests.
- They are specific enough to guide future work without relying on prior chat context.
