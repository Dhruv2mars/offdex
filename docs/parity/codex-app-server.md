# Codex App Server Parity Audit

This file is the completion checklist for Offdex parity with Codex App Server.

## Source

- Codex repository: `https://github.com/openai/codex`
- App Server docs inspected: `codex-rs/app-server/README.md`
- Latest prior planning commit inspected: `48791920a8b122939c4d3feb15673c0a690ca4a0`
- Latest docs re-check date: `2026-05-05`

## Status Terms

- **Supported**: bridge, shared protocol, and WebUI expose the capability end to end.
- **Partial**: bridge or WebUI exposes a useful subset, but behavior is not yet desktop-complete.
- **Bridge-only**: the bridge adapter supports the capability, but Mobile and WebUI do not both expose it.
- **Missing**: Codex App Server exposes the capability, but Offdex does not.
- **Deferred**: deliberately out of current scope or not browser-safe.
- **Unknown**: source docs or installed runtime are not explicit enough yet.

## Rules

- Treat Codex App Server as the authoritative Codex engine interface.
- Inspect Codex desktop app behavior before designing uncertain UX.
- Use Remodex as mobile inspiration and edge-case evidence only.
- Track Mobile, WebUI, and bridge support separately.
- Document deliberate divergence before implementation.
- Browser-safe desktop workflows should exist in WebUI unless explicitly deferred.

## Current Summary

Offdex already covers the main read/send/watch loop: connection, health, thread list/read/start, live events, command output, diffs, approvals, config, inventory, files, skills, plugins, MCP status, account state, rate limits, review start, compact, fork, archive, rollback, steer, and remote diff.

The highest-risk gaps are not one missing button. They are missing shared contracts for several desktop-grade surfaces:

- tool and connector result fidelity is flattened too much for desktop parity;
- composer command surfaces (`/`, `$`, `@`, image/file context, queued follow-up, steer) are not formalized as a shared client layer;
- desktop settings are partially exposed, but config requirements, batch writes, hooks, providers, and advanced runtime controls are not audited end to end;
- Mobile lags WebUI on the newer parity endpoints;
- issue-level implementation plan now needs tracer-bullet slices instead of one large parity ticket.

## Capability Matrix

| Area | Codex App Server capability | Bridge | Mobile | WebUI | Tests/fixtures | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Connection | `initialize`, health, socket lifecycle, bridge status | Supported | Partial | Supported | Partial | WebUI verified live against local bridge. Mobile pairing exists, but current parity endpoints need mobile wiring. |
| Pairing/trust | Local pairing, relay bootstrap, reconnect | Supported | Partial | Supported | Partial | Trusted reconnect exists in protocol/bridge. Browser-safe local/relay paths present. Revoke trust UX still missing. |
| Threads | list, read, resume, start | Supported | Partial | Supported | Covered | WebUI shows live thread list and selected thread. Mobile needs newer parity controls. |
| Thread metadata | rename, fork, archive, unarchive | Supported | Partial | Supported | Covered | WebUI exposes rename/fork/archive; unarchive is available through history state but needs stronger archived-thread UX. |
| Thread compaction | `thread/compact/start`, compaction events | Supported | Missing | Supported | Covered | WebUI exposes Compact. Mobile support not verified. |
| Thread rollback | `thread/rollback` | Supported | Missing | Supported | Covered | WebUI Rewind exists; needs safer confirmation copy and file-state caveat tests. |
| Turns | `turn/start`, active turn tracking | Supported | Partial | Supported | Covered | WebUI can start from new/existing thread when quota allows. Prompt send was not runtime-tested due exhausted quota. |
| Turn interrupt | `turn/interrupt` | Supported | Partial | Supported | Covered | WebUI stop path exists for running turns. Needs live running-turn verification. |
| Turn steer | `turn/steer` | Supported | Missing | Partial | Covered | WebUI sends steer when selected thread is running. Needs running-turn UX proof and queued-input distinction. |
| Live events | thread, turn, item, delta, diff, error notifications | Supported | Partial | Partial | Covered | Bridge normalizes key events. WebUI renders many timeline rows but still flattens some item detail. |
| Transcript items | user messages, agent messages, reasoning, commands | Supported | Partial | Supported | Covered | WebUI renders dense command output and message rows. Reasoning fidelity needs desktop comparison. |
| Tool items | file changes, web, MCP, app tools, custom tool output | Partial | Partial | Partial | Partial | Tool/result taxonomy is not complete enough for desktop parity. |
| Plans | plan and progress item rendering | Partial | Partial | Partial | Partial | Basic timeline support exists, but plan-specific inspector and status semantics need audit. |
| Diffs | turn diff updates | Supported | Partial | Supported | Covered | WebUI parses unified diffs into file cards. |
| Remote git diff | `gitDiffToRemote` | Supported | Missing | Supported | Covered | WebUI verified against current workspace. Companion capability, but desktop-equivalent review workflow needs issue split. |
| Review | `review/start`, review thread linkage | Supported | Partial | Partial | Covered | WebUI can start review and open diff. Review findings UX is still not desktop-complete. |
| Approvals | command, file, permission, auto-approval review | Supported | Partial | Partial | Covered | Bridge resolves modern/legacy permissions. WebUI rail exists; no pending approval was available for live verification. |
| MCP elicitation | `item/tool/requestUserInput` | Supported | Unknown | Partial | Covered | Bridge maps to permission-style request. WebUI needs richer form/input rendering if desktop exposes structured elicitation. |
| Files | directory read, fuzzy file search | Supported | Partial | Supported | Covered | WebUI workspace browser/search exists. Needs file preview/read and stronger attachment flow. |
| Composer text | text input and send | Supported | Partial | Supported | Partial | WebUI composer exists. Quota prevented prompt send test. |
| Composer mentions | `@` file mentions, skill mentions, local images | Partial | Partial | Partial | Partial | Types exist and file attach path exists. Slash/mention command palette is not desktop-complete. |
| Images | local image input items | Partial | Partial | Partial | Partial | Browser file attachment path needs model capability checks and preview/removal verification. |
| Slash commands | `/` command discovery and execution | Missing | Missing | Missing | Missing | Placeholder copy advertises `/`, but no desktop-grade command palette exists. |
| Skill references | `$` skill discovery and input item creation | Partial | Missing | Partial | Partial | Skills inventory/toggle exists; composer `$` flow is not complete. |
| Config read/write | model, reasoning, approval policy, sandbox, web search | Supported | Missing | Supported | Covered | WebUI exposes key controls and updates config. |
| Config requirements | app-server config requirements / setup requirements | Missing | Missing | Missing | Missing | Needed for desktop-grade setup, missing credentials, provider, and environment guidance. |
| Batch config | batch reads/writes where supported | Missing | Missing | Missing | Missing | Current bridge writes single config values. |
| Models/providers | model list, provider summary | Partial | Missing | Partial | Partial | WebUI lists models and selected provider. Provider switching/details incomplete. |
| Account | read, login start/cancel, logout | Supported | Missing | Supported | Covered | WebUI account state and sign in/out exist. Login not live-tested because account already signed in. |
| Rate limits | rate limit and credits read | Supported | Missing | Supported | Covered | WebUI shows quota windows and plan. |
| Plugins | plugin list/install/uninstall | Supported | Missing | Supported | Covered | WebUI verified plugin list. Install/uninstall not live-executed to avoid changing user setup. |
| Skills | skills list/config write | Supported | Missing | Supported | Covered | WebUI toggles skills. Needs composer `$` integration and mobile parity. |
| Apps/connectors | app list, MCP server status, OAuth login | Supported | Missing | Partial | Covered | WebUI shows connectors and OAuth action path. Tool/resource/template browsing missing. |
| MCP resources/templates/tools | list/read/call where exposed | Missing | Missing | Missing | Missing | Current UI only summarizes counts. Desktop parity likely needs inspectable resources/templates/tool metadata. |
| Automations | list recurring jobs | Partial | Missing | Partial | Partial | WebUI shows empty automation inventory. Creation/editing likely belongs to Codex app shell if app-server exposes it; needs source audit. |
| Git companion workflow | diff, review context, commit message, branch/worktree, PR | Partial | Missing | Partial | Partial | Remote diff exists. Commit/push/branch/PR are not implemented as Offdex companion workflow controls. |
| Notifications | attention-worthy events | Missing | Missing | Deferred for WebUI | Missing | Native mobile scope. Browser notifications can be deferred unless PWA install needs them. |
| Desktop runtime target | CLI/Desktop target selection | Supported | Missing | Supported | Covered | WebUI can switch target. Direct desktop visual inspection was blocked by Computer Use safety. |
| External agents | external agent status/control if app-server exposes it | Unknown | Unknown | Unknown | Missing | Needs fresh source audit before implementation. |
| Hooks | hooks list/config/test if app-server exposes it | Missing | Missing | Missing | Missing | Not currently exposed by bridge. |
| Feedback | app feedback/reporting endpoints if exposed | Missing | Missing | Missing | Missing | Not essential to core Codex work loop, but should be audited. |
| Device keys/remote control | app-server device or remote-control endpoints | Unknown | Unknown | Unknown | Missing | Must be inspected before any implementation; security-sensitive. |
| Shell command exec | direct shell command execution endpoints | Deferred | Deferred | Deferred | Missing | Do not expose raw shell control outside Codex approval model unless Codex desktop does and security model is documented. |
| Realtime/audio | realtime/audio APIs | Deferred | Deferred | Deferred | Missing | Voice input is out of current scope. |
| Browser-only unavailable | native windowing, OS-level app chrome, local menu bar | Deferred | Deferred | Deferred | Missing | Fundamentally not WebUI parity target. |

## Browser Verification Notes

Date: `2026-05-05`

Verified through the in-app browser at `http://localhost:3000/webui?bridge=http%3A%2F%2F127.0.0.1%3A42420` against a live bridge:

- WebUI connected to `http://127.0.0.1:42420`.
- Active Codex thread loaded with transcript, command rows, workspace path, branch, and account state.
- Settings panel showed connection state, account, usage, runtime target, workspace, config controls, models, and rate limits.
- Plugins panel listed installed/available plugins with install/uninstall controls.
- Apps panel listed connectors and tool/resource/template counts.
- Files panel was reachable from settings/composer controls.
- Diff to remote loaded a 25-file unified diff and rendered file-aware review cards.

Not verified:

- Direct Codex Desktop visual comparison. Computer Use returned: `Computer Use is not allowed to use the app 'com.openai.codex' for safety reasons.`
- Sending prompts, because the user reported exhausted quota.
- Pending approval resolution, because no approval was pending during verification.
- Live steer/interrupt, because no active turn was running during verification.
- Plugin install/uninstall side effects, to avoid mutating the user's Codex setup during audit.

## Critical Implementation Slices

These are the next tracer-bullet slices that close the biggest desktop-parity gaps without trying to ship all parity in one change.

## Published Issues

- [#75 Desktop-grade composer command surface](https://github.com/Dhruv2mars/offdex/issues/75)
- [#76 Rich tool and connector timeline fidelity](https://github.com/Dhruv2mars/offdex/issues/76)
- [#77 Approval and elicitation parity pass](https://github.com/Dhruv2mars/offdex/issues/77)
- [#78 Config requirements and runtime readiness](https://github.com/Dhruv2mars/offdex/issues/78)
- [#79 Connector resource explorer](https://github.com/Dhruv2mars/offdex/issues/79)
- [#80 Mobile parity catch-up for new bridge capabilities](https://github.com/Dhruv2mars/offdex/issues/80)
- [#81 Codex-context git workflow controls](https://github.com/Dhruv2mars/offdex/issues/81)
- [#82 Desktop behavior evidence pack](https://github.com/Dhruv2mars/offdex/issues/82)

### 1. Desktop-grade Composer Command Surface

Type: AFK

Build WebUI composer parity for browser-safe Codex input discovery:

- `/` command palette for supported app-server and Offdex commands.
- `@` file/workspace mention search with preview and removable attachment chips.
- `$` skill mention search from runtime skill inventory.
- model/input capability checks for image attachments.
- tests for text, file, skill, image, and unsupported-input paths.

Blocked by: none.

User stories: 26, 35, 36, 42, 44, 45, 46.

### 2. Rich Tool And Connector Timeline Fidelity

Type: AFK

Deepen shared timeline semantics so WebUI and Mobile can render desktop-like runtime work instead of flattened generic rows:

- normalize item types for commands, MCP, browser/web, file changes, tool calls, tool results, usage, errors, and plan/progress;
- preserve enough raw metadata for inspector panes without leaking secrets;
- add focused inspectors for command output, tool payloads, connector results, and file changes;
- add reducer tests for streaming deltas and duplicate catch-up suppression.

Blocked by: none.

User stories: 19, 27, 28, 30, 43, 68, 69.

### 3. Approval And Elicitation Parity Pass

Type: AFK

Make WebUI approval behavior match browser-safe Codex Desktop behavior:

- render command, file, MCP, network, guardian review, and structured user-input requests with distinct copy and controls;
- make destructive/risky action affordances visibly different;
- keep approval resolution authoritative through the bridge;
- add tests for duplicate clients, stale approvals, approval resolution, rejection, and structured elicitation.

Blocked by: rich tool and connector timeline fidelity.

User stories: 15, 31, 32, 33, 43, 68.

### 4. Config Requirements And Runtime Readiness

Type: AFK

Expose desktop-grade runtime setup/readiness in WebUI:

- bridge endpoints for config requirements and runtime readiness where Codex App Server exposes them;
- WebUI settings sections for missing credentials, providers, app setup, sandbox constraints, approval policy, and web search;
- batch config write support where app-server supports it;
- tests for invalid config, recoverable setup blockers, and account/provider mismatch.

Blocked by: none.

User stories: 4, 6, 40, 41, 54, 68.

### 5. Connector Resource Explorer

Type: AFK

Turn connector counts into usable desktop-grade connector inspection:

- list MCP resources, resource templates, and tools where app-server exposes them;
- show OAuth/login state and safe reconnect actions;
- let users inspect metadata and attach resources as context where browser-safe;
- add tests for disconnected connectors, OAuth start, unavailable tools, and resource attachment.

Blocked by: rich tool and connector timeline fidelity.

User stories: 42, 43, 68.

### 6. Mobile Parity Catch-up For New Bridge Capabilities

Type: AFK

Wire current WebUI parity endpoints into Mobile with native UI:

- account login/logout, rate limits, settings config, runtime switch;
- steer, rollback, compact, review, rename, fork, archive/unarchive;
- files/search, remote diff, skills/plugins/apps inventory;
- native-safe inspectors and confirmation sheets;
- mobile tests for every shared endpoint path.

Blocked by: none.

User stories: 21-46, 50, 54, 66, 67.

### 7. Codex-context Git Workflow Controls

Type: HITL

Design and implement the browser-safe companion git workflow in Codex context:

- commit message generation from actual diff;
- commit, branch, push/pull, stash/worktree, and PR draft flows where safe;
- clear dirty-worktree and destructive-action confirmations;
- bridge tests that prove no file-destructive operation happens without explicit approval.

Blocked by: user approval of destructive-action UX and supported git scope.

User stories: 50, 51, 52, 53.

### 8. Desktop Behavior Evidence Pack

Type: HITL

Close the only current verification blocker:

- collect user-provided Codex Desktop screenshots or manual observations for composer, approvals, settings, plugins, connectors, diffs, thread actions, and review;
- record verified matches and deliberate divergences in this audit;
- convert divergences into AFK implementation issues.

Blocked by: user-provided desktop evidence, because Computer Use cannot inspect `com.openai.codex`.

User stories: 2, 31, 40, 42, 43, 64.

## Publish Checklist

Before publishing GitHub issues from the slices above:

- Confirm slice granularity.
- Confirm dependencies.
- Confirm HITL versus AFK labels.
- Apply `needs-triage` to every created issue.
- Publish blockers first so dependent issues can reference real issue numbers.
