# Complete Offdex as a Task-Complete Mobile Codex Client

## Problem Statement

Daily Codex users can do serious work from Codex CLI and the Codex desktop app, but there is no task-complete phone and PWA experience that feels like Codex itself. A user should be able to run Codex from a phone, watch the same session live on desktop, approve actions, inspect output, review changes, attach images, and continue normal Codex work without feeling like they switched products or lost capability.

Offdex currently has the right direction: a CLI, an Expo mobile app, a Next.js WebUI, shared packages, pairing, relay, and bridge foundations. It now needs to become an Official-grade Codex client: built on Codex App Server only, Codex-faithful in design, real-time across surfaces, task-complete on mobile, and complete enough that a daily Codex user can rely on it.

## Solution

Complete Offdex as a Codex-faithful mobile and web client for a local Codex session. The Offdex CLI is the single setup path: it validates Codex readiness, starts Codex App Server, starts the Offdex bridge, prints pairing and WebUI/PWA links, reports status, and handles recovery. Offdex Mobile and Offdex WebUI connect through the bridge, use a shared Codex client layer, and implement every stable Codex App Server capability in the best platform-native form possible.

The mobile product is not a generic chat app and not a companion-only supervisor. It is a Codex-native mobile workspace: a Thread drawer, an Active turn workspace, and Inspector sheets for dense tasks such as diffs, command output, approvals, plans, runtime settings, git actions, skills, apps, and thread details. The WebUI/PWA is separate from the frozen landing page and should provide the same core Codex client workflows where browser platform constraints allow.

Offdex must preserve a real-time shared session across Codex desktop, Mobile, and WebUI. A session started anywhere should be visible everywhere with no meaningful delay, preserving thread identity and catching up after reconnect without duplicates. Remodex remains inspiration for mobile patterns and edge cases, but Codex desktop behavior and Codex App Server protocol are the source of truth.

## User Stories

1. As a daily Codex user, I want to use Codex from my phone, so that I can do normal Codex work away from my desk.
2. As a daily Codex user, I want Offdex to feel like the Codex app, so that I do not feel like I switched products.
3. As a daily Codex user, I want setup to start with one CLI command, so that I do not manually wire Codex App Server or bridge internals.
4. As a new user, I want `offdex` to explain what to do next, so that setup is obvious.
5. As a user, I want `offdex start` to start Codex App Server and the Offdex bridge, so that clients can pair immediately.
6. As a user, I want `offdex status` to show Codex, bridge, relay, and client status, so that I can diagnose connection problems.
7. As a user, I want `offdex stop` to cleanly stop Offdex-managed runtime, so that I can shut it down without stale processes.
8. As a user, I want QR pairing from the CLI, so that my phone or WebUI can trust my machine.
9. As a user, I want WebUI/PWA links printed by the CLI, so that I can open the browser client quickly.
10. As a user, I want pairing to persist securely, so that I do not scan every time.
11. As a user, I want local bridge connection first and relay fallback when away, so that Offdex works on LAN and remotely.
12. As a user, I want to revoke trust from clients or CLI, so that I control paired devices.
13. As a user, I want no pairing or session secrets logged, so that trust tokens are not leaked.
14. As a user, I want multiple trusted clients connected at the same time, so that phone and WebUI can both observe Codex.
15. As a user, I want actions and approvals to resolve authoritatively, so that two clients do not duplicate or conflict.
16. As a user, I want to see the same thread on desktop and phone in real time, so that there is no handoff concept.
17. As a user, I want a session started on phone to appear on desktop live, so that both surfaces stay aligned.
18. As a user, I want a session started on desktop to appear on phone live, so that I can monitor and control it remotely.
19. As a user, I want streamed messages, command output, diffs, and status updates without meaningful delay, so that Offdex feels live.
20. As a user, I want reconnect catch-up without duplicate messages, so that temporary network loss does not corrupt the transcript.
21. As a user, I want a searchable Thread drawer, so that I can find previous Codex work quickly.
22. As a user, I want grouped threads with running badges, so that active work is visible at a glance.
23. As a user, I want archived chats available, so that older work can be restored when needed.
24. As a user, I want to start a new thread from the drawer, so that mobile creation is first-class.
25. As a user, I want to choose project/workspace context before starting a thread, so that Codex runs in the right place.
26. As a user, I want the Active turn workspace to be the main screen, so that transcript, composer, and run controls stay together.
27. As a user, I want live Codex items rendered clearly, so that messages, reasoning, commands, diffs, and tool calls are understandable.
28. As a user, I want command output to be expandable, so that dense logs do not overwhelm the thread.
29. As a user, I want diffs in a dedicated inspector, so that review is readable on a phone.
30. As a user, I want plans in a compact, accessible surface, so that I can track Codex’s work without losing the transcript.
31. As a user, I want approvals to behave like Codex desktop, so that safety prompts are familiar.
32. As a user, I want approvals adapted to mobile layout, so that I can approve or deny accurately with one hand.
33. As a user, I want destructive or risky actions to be extra clear, so that I do not approve the wrong operation.
34. As a user, I want to interrupt a running turn, so that I can stop incorrect work quickly.
35. As a user, I want to steer a running turn where Codex supports it, so that I can correct course without starting over.
36. As a user, I want to queue follow-up prompts where supported, so that I can keep momentum during long runs.
37. As a user, I want to fork threads where supported, so that I can branch work from an earlier state.
38. As a user, I want to resume threads, so that ongoing work continues naturally.
39. As a user, I want to archive threads, so that my workspace stays manageable.
40. As a user, I want model, reasoning, sandbox, and approval controls where Codex supports them, so that mobile has the same power as desktop.
41. As a user, I want account and auth state shown clearly, so that login and quota issues are understandable.
42. As a user, I want skills listed and usable where app-server supports them, so that Codex workflows carry over.
43. As a user, I want apps/connectors shown and usable where app-server supports them, so that connected workflows carry over.
44. As a user, I want image attachments from camera or library, so that mobile can provide visual context to Codex.
45. As a user, I want image previews before sending, so that I can remove the wrong attachment.
46. As a user, I want clear unsupported-image messaging, so that model capability limits are obvious.
47. As a user, I want notifications only for attention-worthy events, so that I know when a turn completes or needs input.
48. As a user, I want notification taps to open the right thread, so that I can act immediately.
49. As a user, I want no noisy notifications for stream chunks, so that Offdex does not become distracting.
50. As a user, I want git actions in Codex context, so that I can commit, push, branch, and review without leaving the workflow.
51. As a user, I want generated commit messages based on actual diffs, so that commits are faster and accurate.
52. As a user, I want branch and worktree actions to be careful, so that mobile git workflows do not damage local work.
53. As a user, I want PR draft generation where supported, so that mobile can finish the coding loop.
54. As a user, I want bridge diagnostics visible, so that setup and connectivity problems are actionable.
55. As an iOS user without native App Store access, I want an installable PWA, so that I can use Offdex on iPhone now.
56. As an Android user, I want a native Android build, so that I get the best mobile experience.
57. As an Android user, I want Play distribution and APK releases, so that installation is straightforward.
58. As a future iOS user, I want the React Native app ready for App Store submission, so that native iOS can ship when available.
59. As a WebUI user, I want the browser client to be separate from the landing page, so that the app can evolve without touching marketing.
60. As a maintainer, I want the landing page frozen, so that completion work does not disturb the current perfect marketing page.
61. As a maintainer, I want a protocol parity audit, so that “complete” is measured against current Codex App Server.
62. As a maintainer, I want stable app-server capabilities marked implemented, partial, missing, or deferred, so that omissions are explicit.
63. As a maintainer, I want Mobile, WebUI, and bridge support tracked separately, so that parity gaps are visible.
64. As a maintainer, I want official Codex behavior inspected before uncertain UX decisions, so that Offdex stays Codex-faithful.
65. As a maintainer, I want Remodex used as inspiration only, so that Offdex does not inherit companion-only framing.
66. As a maintainer, I want shared protocol/state modules, so that Mobile and WebUI do not drift.
67. As a maintainer, I want platform-native UI where needed, so that shared code does not make Mobile or WebUI feel wrong.
68. As a maintainer, I want testable deep modules, so that protocol, transport, approvals, diffs, and reconnect logic can be verified without fragile UI tests.
69. As a maintainer, I want active streaming performance protected by tests and architecture, so that long sessions remain usable.
70. As a maintainer, I want no voice input in current scope, so that completion work focuses on agreed priorities.

## Implementation Decisions

- Offdex is built on Codex App Server only. Do not scrape terminal output, replace Codex behavior with direct model API calls, or create a custom Codex engine.
- The Offdex CLI owns setup and lifecycle. Mobile and WebUI do not launch Codex directly.
- The bridge must launch or connect to Codex App Server, maintain the authoritative Codex boundary, and expose a trusted local/remote transport to clients.
- The bridge must support multiple trusted clients concurrently and broadcast shared session events while preventing duplicate action or approval resolution.
- Real-time shared session parity is a hard performance requirement. Events must be live-first, with catch-up used for reconnect recovery rather than as the only sync strategy.
- A shared Codex client layer should own protocol types, event normalization, reducers, approvals, diffs, plans, item models, transport abstractions, and reconnect/catch-up behavior.
- Offdex Mobile and Offdex WebUI should share Codex semantics and design language, but keep navigation, gestures, keyboard handling, haptics, notifications, camera, and browser constraints platform-native.
- Offdex Mobile uses a Codex-native mobile workspace: Thread drawer, Active turn workspace, and Inspector sheets.
- Offdex WebUI is the browser/PWA Codex client. It is separate from the landing page.
- The current landing page is frozen and must not be changed unless explicitly reopened.
- AI Elements is the foundation for AI conversation UI primitives where applicable, adapted toward the Codex-faithful visual language.
- The visual design should be as close as possible to OpenAI Codex app and brand identity while using Offdex-owned implementation assets and mobile-native adaptations.
- Expo APIs and React Native are the default for mobile. Software Mansion libraries should be used where they improve core UX or performance. Custom native modules should be used only where platform integration, performance, secure storage, background/reconnect behavior, deep links, or input gaps justify the cost.
- Companion capabilities are allowed when they improve mobile Codex use without replacing Codex behavior. Current companion capabilities include git workflows, notifications, trusted reconnect, QR recovery, bridge diagnostics, and image attachment pipeline.
- Voice input is deferred and not part of current completion scope.
- Git actions should be Codex-context workflow controls, not a standalone generic git client.
- Image attachments are current scope for composer input where selected model and app-server flow support images.
- Notifications are current scope for attention-worthy events: turn completion, approval/input needed, and active-work disconnects.
- PWA is the near-term iOS distribution path because native iOS App Store distribution is blocked until an Apple Developer account is available.
- Android native distribution is first-class because Google Play Developer access exists; APK releases remain useful.
- Unknown product or UX decisions follow the Codex-first decision rule: inspect Codex desktop first, Codex App Server protocol second, Remodex only as mobile inspiration or edge-case evidence, then document deliberate divergence before building it.
- The protocol parity audit in `docs/parity/codex-app-server.md` is the build checklist and must be expanded before final implementation planning.

## Testing Decisions

- Tests should verify external behavior and user-observable protocol outcomes, not internal implementation details.
- The Codex App Server protocol layer needs fixture-based tests for request/response shapes, notifications, item types, approval flows, auth/account flows, thread/turn flows, diff/plan events, skills, apps, and experimental/deferred APIs.
- The shared Codex client layer needs reducer tests for streaming deltas, item ordering, turn lifecycle, thread lifecycle, approval states, diff updates, plan updates, reconnect catch-up, duplicate suppression, and multi-client event ordering.
- The bridge runtime needs tests for app-server lifecycle, multi-client fanout, authoritative action handling, pairing, trusted reconnect, local-first connection, relay fallback, no secret logging, disconnect/revoke, and diagnostics.
- CLI tests should cover onboarding text, help, start/status/stop behavior, missing Codex guidance, app-server startup errors, bridge startup errors, pairing output, WebUI/PWA URL output, and recovery paths.
- Mobile tests should cover Thread drawer behavior, Active turn workspace rendering, Inspector sheet flows, composer send availability, image attachment intake, approval UX, diff/command rendering, notifications, reconnect, and performance-sensitive streaming behavior.
- WebUI tests should cover pairing, reconnect, thread list/read/start/resume, active turn streaming, approvals, diffs, command output, image attachment where browser supports it, PWA install readiness, and no changes to frozen landing routes.
- Companion workflow tests should cover git status, diff, commit message generation, commit, push/pull, branch actions, worktree actions, stash, PR draft generation, error handling, and destructive-action safety.
- Distribution tests should cover Android build/release expectations, APK artifact expectations, PWA manifest/service worker behavior, and native iOS readiness without requiring App Store distribution.
- Existing prior art includes nearby `bun test` suites in `packages/protocol`, `packages/bridge`, `packages/relay`, `packages/control-plane`, `packages/npm`, `apps/mobile/test`, and `apps/web/test`.

## Out of Scope

- Redesigning or editing the current landing page.
- Voice input or transcription.
- Replacing Codex App Server with direct model API calls.
- Scraping terminal output from Codex CLI as the engine integration.
- Building a standalone cloud Codex clone.
- Building a generic mobile git client detached from Codex workflow context.
- Treating Remodex as the source of truth when it conflicts with Codex desktop behavior or Codex App Server.
- Native iOS App Store submission before an Apple Developer account is available.

## Further Notes

- Completion is not a deliberately reduced v1. Implementation can be sequenced by dependencies, but the product target is full stable Codex App Server parity.
- The protocol parity audit must be updated against the current official Codex repository before implementation issues are split.
- The latest inspected Codex commit during planning was `48791920a8b122939c4d3feb15673c0a690ca4a0`.
- Direct Computer Use inspection of the installed Codex desktop app was blocked by safety restrictions, so future desktop behavior inspection may need user-provided screenshots, manual observation, or allowed non-invasive references.
