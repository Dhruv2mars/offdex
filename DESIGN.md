# Design

## Theme

Offdex WebUI is a product surface, not a marketing surface. Layout and information density should feel close to Codex Desktop, but styling should stay Offdex: bright, precise, calm, and machine-local.

Default theme is light. It should feel like focused daylight work on a real machine, not dark mode for its own sake. Neutral surfaces stay slightly warm instead of stark white or blue-gray.

## Color

Use restrained product color.

- Background: `#ffffff`
- Foreground: `#171717`
- Muted surface: `#fafafa`
- Border: `#ebebeb`
- Accent surface: `#ebf5ff`
- Accent foreground: `#0068d6`
- Success / active runtime: `#0a72ef`
- Attention / experimental / secondary action: `#de1d8d`
- Destructive / stop / risky action: `#ff5b4f`

Rules:

- Color carries state, current selection, and action priority. It is not decorative wallpaper.
- Keep dense panels mostly neutral so command output, diffs, approvals, and badges can stand out.
- Primary action color should stay rare and intentional.

## Typography

- Sans: `var(--font-body-sans), system-ui, sans-serif`
- Mono: `var(--font-body-mono), ui-monospace, SFMono-Regular, monospace`

Use one UI family plus mono for paths, commands, and technical metadata. Labels and controls should look native-adjacent and familiar. Keep type scale tight and usable in dense workbench surfaces.

## Layout

The web client should use a Codex-like workbench shell:

- left rail for thread navigation and thread actions
- center workspace for transcript, streaming items, composer, and active-turn controls
- right inspector for permissions, settings, diffs, files, plugins, apps, and other dense task surfaces

Use panels and cards only when they clarify state. Avoid nested card stacks. Dense surfaces should rely on spacing rhythm, borders, and muted layers more than heavy containers.

## Components

- Thread rows must surface urgency: running work, pending permissions, failures, review state.
- Timeline items must distinguish messages, reasoning, plans, command output, tool activity, diffs, and token usage at a glance.
- Buttons must feel immediate and precise. Favor compact controls, crisp borders, and subtle active feedback.
- Inspector panels should feel like workstation drawers: dense, readable, and purpose-built for a task.
- Empty states must teach the next action, not apologize for being empty.

## Motion

- Keep routine product motion under 220ms.
- Use ease-out for reveal and dismissal.
- No choreographed page-load animation in the workbench.
- Motion should clarify state changes: connect, send, interrupt, open panel, complete action.

## Copy

Copy should be short, technical, and calm. Prefer concrete state over motivational language. If something failed, say what failed and what the user can do next.
