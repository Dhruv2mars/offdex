# Offdex

Offdex is a companion app for using a local Codex session from mobile and web through a trusted bridge running on the user's computer.

## Language

**Offdex**:
A companion app for using a local Codex session from mobile and web through a trusted bridge running on the user's computer.
_Avoid_: Cloud Codex clone, remote terminal, mobile-only Codex

**Official-grade Codex client**:
A client experience that lets an average user do the work they would do in Codex CLI or the Codex app while feeling native to the Codex product family.
_Avoid_: Separate product, wrapper, remote terminal

**Codex parity target**:
The goal that Offdex should expose the local Codex work loop, capabilities, and product feel expected from official Codex client surfaces, adapted for mobile and web.
_Avoid_: MVP subset, remote shell parity, unrelated mobile assistant

**Codex App Server**:
The official local Codex JSON-RPC interface that Offdex uses as its only Codex engine integration layer.
_Avoid_: Terminal scraping, custom Codex engine, direct model API replacement

**App Server parity**:
The requirement that every capability supported by Codex App Server should be implemented in Offdex with the best mobile and web experience possible.
_Avoid_: Partial client, unsupported-by-choice, terminal-only fallback

**Task-complete mobile Codex**:
The expectation that a daily Codex user can complete their normal Codex work fully from Offdex Mobile without needing to fall back to desktop for core workflows.
_Avoid_: Companion-only app, supervision-first app, notification client

**Codex-native mobile workspace**:
A mobile information architecture that adapts official Codex app concepts and Remodex-inspired mobile patterns into a complete phone workspace rather than reducing Codex to simple chat tabs.
_Avoid_: Chat-only app, generic tab shell, remote terminal UI

**Thread drawer**:
The phone-native navigation drawer for searchable, grouped Codex threads, running badges, archived chats, new-thread actions, and project selection.
_Avoid_: Tab-only thread list, hidden history screen

**Active turn workspace**:
The primary mobile work surface that combines transcript, live Codex App Server items, composer, and immediate run controls.
_Avoid_: Passive chat transcript, terminal window

**Inspector sheet**:
A focused full-screen or partial mobile surface for dense Codex details such as diffs, command output, approvals, plans, runtime settings, git actions, skills, apps, and thread details.
_Avoid_: Permanent tab, cramped inline panel

**Offdex companion capability**:
A phone-native or bridge-owned enhancement around Codex, such as git actions, voice dictation, push notifications, device trust, QR recovery, bridge diagnostics, camera attachments, or worktree helpers.
_Avoid_: Custom Codex engine behavior, model replacement, protocol drift

**Expo-first native policy**:
The mobile engineering rule that Offdex uses Expo APIs and React Native by default, Software Mansion libraries when they improve core UX or performance, and custom native modules only where the platform boundary earns the cost.
_Avoid_: Native-first rewrite, webview-only app, avoid-native-at-all-costs

**Streaming performance bar**:
The requirement that active Codex streaming stays responsive on mobile, with stable input, incremental rendering, lazy dense views, reliable reconnect catch-up, and no unnecessary motion on high-frequency actions.
_Avoid_: Re-rendering whole transcripts, blocking composer input, duplicated catch-up messages

**Codex-faithful visual language**:
The design goal that Offdex should feel as close as possible to OpenAI's Codex app and brand identity while using Offdex-owned implementation assets and mobile-native adaptations.
_Avoid_: Generic chatbot, SaaS dashboard, unrelated brand system

**AI Elements foundation**:
The frontend design and component foundation for Offdex's AI conversation surfaces, adapted to match the Codex-faithful visual language and native mobile needs.
_Avoid_: From-scratch generic chat components, incompatible AI UI primitives

**Remodex inspiration**:
Remodex is a reference for proven mobile Codex patterns and edge cases, but not the product authority for Offdex.
_Avoid_: Remodex clone, companion-only framing, upstream behavior override

**Codex-context git workflow**:
A carefully crafted mobile git workflow surfaced in the context of Codex changes, reviews, branches, and handoff rather than as a standalone generic git client.
_Avoid_: Generic git app, detached source-control tab, careless destructive actions

**Codex-faithful approval UX**:
An approval experience that follows the Codex desktop app's interaction model as closely as possible while adapting layout and controls to mobile.
_Avoid_: Hidden approval queue, custom safety model, generic permission dialog

**Codex-first decision rule**:
The rule that uncertain Offdex behavior should be decided by inspecting Codex desktop app behavior first, Codex App Server protocol second, and Remodex only as mobile inspiration or edge-case evidence.
_Avoid_: Guessing, Remodex-first decisions, mobile novelty over Codex parity

**PWA distribution bridge**:
Offdex WebUI packaged as an installable PWA for iOS users until native iOS App Store distribution is possible.
_Avoid_: Lesser demo, throwaway web app, replacement for native readiness

**Android native distribution**:
The first-class Android distribution path through native builds, with Google Play available and GitHub Releases APK still useful for direct install.
_Avoid_: Web-only Android, Android as afterthought

**Deferred voice input**:
Voice input and transcription are not part of the current completion scope.
_Avoid_: Voice-first workflow, transcription dependency

**Mobile image attachment**:
A current-scope composer capability for attaching camera or library images to Codex turns where the selected model and app-server flow support image input.
_Avoid_: Voice substitute, hidden upload, send-without-preview

**Codex attention notification**:
A mobile notification for turn completion, approval/input needed, or active-work disconnects that routes back to the relevant thread without notifying for ordinary stream chunks.
_Avoid_: Noisy stream notifications, generic alert, wrong-thread notification

**Real-time shared session**:
The expectation that Codex desktop and Offdex clients can observe the same session concurrently, including messages, streamed content, commands, and other run activity with no meaningful delay.
_Avoid_: Handoff, delayed sync, separate mobile session

**Live parity performance requirement**:
The requirement that Offdex observes and renders shared Codex session activity in real time, including sessions started from desktop, phone, or WebUI, without meaningful delay or duplicate catch-up items.
_Avoid_: Poll-only sync, stale mobile transcript, mobile-only thread identity

**Multi-client bridge**:
The bridge behavior where multiple trusted Offdex clients can connect concurrently, receive shared session events, and submit actions through one authoritative app-server boundary.
_Avoid_: Single-client lockout, duplicate approval resolution, per-client private session

**Protocol parity audit**:
A capability matrix generated from the current official Codex App Server schema and docs, tracking Offdex support for methods, notifications, approvals, items, auth, skills, apps, and experimental APIs.
_Avoid_: Guess-based roadmap, stale parity checklist, undocumented omissions

**Offdex completion**:
The state where CLI, Mobile, WebUI/PWA, bridge, real-time shared session behavior, stable Codex App Server parity, companion workflows, distribution, and tests are complete without touching the frozen landing page.
_Avoid_: Partial parity, demo-only mobile, WebUI afterthought

**Offdex PRD**:
The next planning artifact that turns the resolved Offdex vision, constraints, architecture, UX model, protocol parity requirement, and completion definition into a product requirements document before issues are created.
_Avoid_: Issues before product alignment, implementation-first roadmap

**Selective UI sharing**:
The rule that Mobile and WebUI share Codex semantics, visual language, tokens, and component anatomy where useful, but keep navigation and platform interaction native to each surface.
_Avoid_: Forced universal UI, divergent product semantics, lowest-common-denominator components

**Frozen landing page**:
The current Offdex landing page, which should not be changed as part of the completion effort.
_Avoid_: Landing redesign, marketing rewrite, activation-page refactor

**Offdex CLI**:
The setup and lifecycle owner that prepares Codex, starts Codex App Server, starts the Offdex bridge, and presents pairing to clients.
_Avoid_: Mobile launcher, web launcher, passive wrapper

**Single setup path**:
The CLI guarantee that `offdex` is the one entrypoint for install validation, Codex readiness, app-server startup, bridge startup, pairing, WebUI/PWA links, status, recovery, and diagnostics.
_Avoid_: Multi-tool setup, manual app-server setup, undocumented pairing steps

**Trusted reconnect**:
The pairing model where a client scans once, stores trust securely, and reconnects automatically to the user's bridge locally or through relay until trust is revoked.
_Avoid_: Pair every launch, plaintext bearer logs, hidden trust state

**Offdex Mobile**:
The Expo native client for phone-first Codex work.
_Avoid_: React Native demo, mobile shell

**Offdex Web**:
The Next.js surface that contains marketing, docs, downloads, and the browser Codex client.
_Avoid_: Landing page only

**Offdex WebUI**:
The browser and future PWA Codex client, functionally aligned with Offdex Mobile where the platform allows.
_Avoid_: Marketing page, admin panel

**Shared Codex client layer**:
The shared protocol, reducer, and state layer used by Offdex Mobile and Offdex WebUI to interpret Codex App Server behavior consistently.
_Avoid_: Duplicated mobile logic, duplicated web logic, UI-owned protocol semantics

## Relationships

- **Offdex** connects mobile and web clients to a local Codex session through a trusted bridge.
- An **Official-grade Codex client** preserves Codex workflows while improving access from mobile and web.
- The **Codex parity target** uses official Codex behavior as the reference point and adapts it to phone and PWA interaction patterns.
- **Offdex** is built on top of **Codex App Server** only.
- **App Server parity** means Offdex adapts every supported Codex App Server capability for mobile and web instead of intentionally omitting desktop-shaped workflows.
- **Task-complete mobile Codex** means creation, supervision, control, review, and continuation are all first-class mobile workflows.
- A **Codex-native mobile workspace** should preserve the Codex app mental model while using phone-native navigation, sheets, drawers, gestures, notifications, camera, voice, and haptics.
- **Offdex Mobile** centers on an **Active turn workspace**, with the **Thread drawer** for navigation and **Inspector sheets** for dense secondary tasks.
- The **Offdex CLI** provides the **Single setup path**.
- **Trusted reconnect** should prefer the local bridge first and fall back to relay when local access is unavailable.
- **Codex App Server** owns Codex behavior; **Offdex companion capabilities** improve mobile use around that behavior without replacing it.
- **Offdex Mobile** follows the **Expo-first native policy**.
- The **Active turn workspace** must meet the **Streaming performance bar** during long-running Codex sessions.
- **Offdex Mobile** and **Offdex WebUI** should use a **Codex-faithful visual language**.
- **AI Elements foundation** guides conversation, message, tool display, and prompt-input components where it fits the platform.
- **Codex App Server** and the official Codex app mental model take priority over **Remodex inspiration** when product decisions conflict.
- **Codex-context git workflow** is an Offdex companion capability that must be designed around Codex app behavior and active thread context.
- **Codex-faithful approval UX** should mirror Codex desktop app behavior wherever possible.
- The **Codex-first decision rule** governs uncertain product, UX, and protocol decisions.
- **PWA distribution bridge** exists because native iOS distribution is blocked until an Apple Developer account is available, while Offdex Mobile remains built for future App Store submission.
- **Android native distribution** is available because Google Play Developer access exists.
- **Selective UI sharing** keeps product behavior consistent while allowing Offdex Mobile and Offdex WebUI to feel native on their platforms.
- **Deferred voice input** means voice should not be prioritized in the current completion work.
- **Mobile image attachment** should use platform-native camera/library flows, preview before send, and degrade clearly when images are unsupported.
- **Codex attention notifications** are current scope for mobile task completion.
- **Real-time shared session** replaces the idea of desktop handoff; desktop and Offdex should stay live together.
- **Live parity performance requirement** makes real-time shared session behavior a hard performance and UX requirement.
- **Multi-client bridge** supports simultaneous Mobile and WebUI clients while keeping Codex App Server as the authoritative state boundary.
- A **Protocol parity audit** should drive completion work before feature implementation decisions are finalized.
- **Offdex completion** requires no unhandled stable Codex App Server capability in the protocol parity audit.
- The **Offdex PRD** should be written before breaking completion work into issues.
- The **Frozen landing page** is out of scope for completion work unless the user explicitly reopens it.
- **Offdex WebUI** remains in scope as the browser and PWA Codex client even though the **Frozen landing page** is out of scope.
- The **Offdex CLI** owns Codex App Server lifecycle; mobile and web clients talk to the Offdex bridge rather than launching Codex directly.
- **Offdex Web** contains **Offdex WebUI**, but the WebUI is the app surface while marketing/docs/downloads are support surfaces.
- **Offdex Mobile** and **Offdex WebUI** should remain functionally aligned wherever platform constraints allow.
- The **Shared Codex client layer** owns Codex App Server semantics so **Offdex Mobile** and **Offdex WebUI** differ mainly in presentation and platform capabilities.

## Example dialogue

> **Dev:** "Is Offdex a hosted Codex replacement?"
> **Domain expert:** "No. Offdex is a companion app that lets trusted mobile and web clients use the user's local Codex session."
>
> **Dev:** "After pairing, should the user feel like they switched products?"
> **Domain expert:** "No. Offdex should feel like a polished Codex client that OpenAI could have shipped."
>
> **Dev:** "Are we building a small v1 first?"
> **Domain expert:** "No. The product target is full Codex parity, with implementation ordered by dependency rather than by product ambition."
>
> **Dev:** "Should the bridge parse terminal output from Codex CLI?"
> **Domain expert:** "No. Offdex is built on top of Codex App Server only."
>
> **Dev:** "Can we skip app-server capabilities that feel desktop-oriented?"
> **Domain expert:** "No. If Codex App Server supports it, Offdex should implement it in the best mobile and web form possible."
>
> **Dev:** "Should users manually start Codex App Server before using Offdex?"
> **Domain expert:** "No. The Offdex CLI should make setup, startup, pairing, status, recovery, and diagnostics one path."
>
> **Dev:** "Should users scan every time?"
> **Domain expert:** "No. Pair once, store trust securely, reconnect automatically, and provide explicit revoke/disconnect controls."
>
> **Dev:** "Is mobile mainly for supervising desktop Codex?"
> **Domain expert:** "No. A daily Codex user should be able to complete normal Codex work fully from Offdex Mobile."
>
> **Dev:** "Should mobile use generic tabs for every area?"
> **Domain expert:** "No. Mobile should feel like Codex adapted carefully for a phone, not a generic chat app."
>
> **Dev:** "Where should diffs, approvals, git actions, and runtime settings live?"
> **Domain expert:** "In inspector sheets launched from the active turn workspace, so the main Codex flow stays focused."
>
> **Dev:** "Can Offdex add git actions and voice if Codex App Server is the only engine?"
> **Domain expert:** "Yes. Those are companion capabilities around Codex, not replacements for Codex behavior."
>
> **Dev:** "Should we write native modules for everything?"
> **Domain expert:** "No. Start with Expo and React Native; use Software Mansion libraries and native modules where they materially improve UX, performance, or platform integration."
>
> **Dev:** "Can the transcript re-render every time a stream delta arrives?"
> **Domain expert:** "No. Active streaming must stay responsive, especially composer input, approvals, and scrolling."
>
> **Dev:** "Should Offdex invent its own visual brand?"
> **Domain expert:** "No. Offdex should feel as close as possible to the Codex app and OpenAI brand identity, adapted carefully for mobile."
>
> **Dev:** "Should AI UI primitives be invented from scratch?"
> **Domain expert:** "No. Use AI Elements as the frontend foundation and adapt it toward Codex-faithful mobile and web surfaces."
>
> **Dev:** "Should Offdex copy Remodex's product framing?"
> **Domain expert:** "No. Remodex is inspiration; Offdex is a task-complete Codex mobile app."
>
> **Dev:** "Should git actions be a generic mobile git client?"
> **Domain expert:** "No. Git actions should be carefully crafted around Codex app workflows, especially changes, reviews, branches, and handoff."
>
> **Dev:** "Should Offdex invent its own approval flow?"
> **Domain expert:** "No. Approval behavior should follow Codex desktop app as closely as possible."
>
> **Dev:** "What if we are unsure how a feature should behave?"
> **Domain expert:** "Inspect Codex desktop first, then Codex App Server, then Remodex for mobile evidence, and document any deliberate divergence."
>
> **Dev:** "Why invest in PWA if native Mobile exists?"
> **Domain expert:** "Because iOS App Store distribution is blocked for now; the PWA gives iOS users access while the React Native app stays ready for App Store submission later."
>
> **Dev:** "Is Android blocked like iOS?"
> **Domain expert:** "No. Android native distribution is available through Google Play, with APK releases as a direct-install path."
>
> **Dev:** "Should voice be added now?"
> **Domain expert:** "No. Voice input is deferred for now."
>
> **Dev:** "Should mobile support image input?"
> **Domain expert:** "Yes. Camera and library attachments are current scope when Codex/model support image input."
>
> **Dev:** "Should every stream update notify the phone?"
> **Domain expert:** "No. Notify only for attention-worthy Codex events such as completion, needed input, or active-work disconnects."
>
> **Dev:** "Should Offdex have a handoff flow to desktop?"
> **Domain expert:** "No. The desktop app and Offdex should observe the same session in real time, so there is no handoff concept."
>
> **Dev:** "Can shared session sync be eventually consistent?"
> **Domain expert:** "No. Real-time side-by-side visibility is a performance requirement for the best user experience."
>
> **Dev:** "Can only one Offdex client connect at a time?"
> **Domain expert:** "No. Multiple trusted clients can be open, but actions and approvals need one authoritative resolution path."
>
> **Dev:** "How do we know what complete means?"
> **Domain expert:** "Generate a protocol parity audit from current Codex App Server sources and use it as the build checklist."
>
> **Dev:** "Can Offdex be called complete if Mobile works but WebUI/PWA is still a demo?"
> **Domain expert:** "No. Completion includes CLI, Mobile, WebUI/PWA, bridge, real-time parity, tests, distribution, and stable app-server parity."
>
> **Dev:** "Should we create issues before writing a PRD?"
> **Domain expert:** "No. Write the Offdex PRD first, then split it into implementation issues."
>
> **Dev:** "Should Mobile and WebUI use one identical UI implementation?"
> **Domain expert:** "No. Share semantics and design language, but keep navigation, gestures, keyboard behavior, and platform features native."
>
> **Dev:** "Should we redesign the landing page while completing Offdex?"
> **Domain expert:** "No. The current landing page is considered perfect and should not be touched."
>
> **Dev:** "Is WebUI frozen too?"
> **Domain expert:** "No. WebUI is separate from the landing page and remains in scope."
>
> **Dev:** "Should the mobile app start Codex itself?"
> **Domain expert:** "No. The Offdex CLI owns setup and lifecycle; clients connect through the bridge."
>
> **Dev:** "Is the landing page the web app?"
> **Domain expert:** "No. Offdex Web contains support pages and Offdex WebUI; WebUI is the browser Codex client."
>
> **Dev:** "Should Mobile and WebUI each interpret app-server events themselves?"
> **Domain expert:** "No. They should share one Codex client layer so product behavior stays aligned."

## Flagged ambiguities

- "Codex mobile app" was resolved to mean a mobile and web companion for a local Codex session, not a standalone cloud Codex clone.
- "Using Offdex" was resolved to mean doing Codex work through an official-grade client experience, not merely controlling a remote terminal.
- "No v1" was resolved to mean the product target should not be scoped down to a deliberately incomplete experience; implementation can still be sequenced by dependencies.
- "Codex integration" was resolved to mean Codex App Server only, not terminal scraping or a direct model API replacement.
- "Full parity" was resolved to mean every Codex App Server capability should be represented in Offdex unless the server itself does not support it.
- "CLI setup" was resolved as a single setup path for Codex readiness, app-server startup, bridge startup, pairing, WebUI/PWA links, status, recovery, and diagnostics.
- "Pairing" was resolved as trusted reconnect with local-first connection and relay fallback.
- "Mobile priority" was resolved to mean creation, supervision, control, review, and continuation are all first-class, not ranked as companion-only workflows.
- "Mobile IA" was not accepted as a generic tab layout; it should be a Codex-native mobile workspace informed by the official Codex app and Remodex.
- "Mobile navigation" was resolved as thread drawer plus active turn workspace plus inspector sheets.
- "Built on Codex App Server only" was clarified as the engine boundary, not a ban on bridge-owned mobile companion capabilities.
- "Native mobile implementation" was resolved as Expo-first, with Software Mansion libraries and custom native modules used where they earn their cost.
- "Best possible performance" was resolved as responsive active streaming, stable input, lazy dense rendering, and reliable reconnect/catch-up behavior.
- "Visual design" was resolved as Codex-faithful rather than a distinct Offdex-first brand direction.
- "Frontend AI components" were resolved to use AI Elements as a foundation where applicable.
- "Remodex" was resolved as inspiration for mobile adaptation and edge cases, not the source of truth when it conflicts with Codex parity.
- "Git actions" were accepted as first-class companion capabilities, but only as Codex-context workflow controls.
- "Approvals" were resolved as Codex desktop app parity, with mobile adaptation only where the form factor requires it.
- "Unknown behavior" was resolved with the Codex-first decision rule.
- "PWA" was resolved as the near-term iOS distribution path, not a replacement for native mobile readiness.
- "Android distribution" was resolved as first-class native distribution, with Google Play available and APK releases still useful.
- "Voice input" was resolved as deferred, not current scope.
- "Image attachments" were resolved as current scope for mobile composer input.
- "Notifications" were resolved as current scope for attention-worthy Codex events.
- "Desktop handoff" was rejected; the target is a real-time shared session visible on desktop and Offdex simultaneously.
- "Real-time shared session" was resolved as a hard performance requirement, not a nice-to-have.
- "Bridge clients" were resolved as multi-client, with shared event broadcast and authoritative action handling.
- "Completion checklist" was resolved as a protocol parity audit against current official Codex App Server schema and docs.
- "Done" was resolved as full CLI, Mobile, WebUI/PWA, bridge, real-time shared session, stable protocol parity, companion workflows, distribution, and test completion without changing the landing page.
- "Next planning step" was resolved as writing a PRD before creating implementation issues.
- "Mobile/WebUI sharing" was resolved as full protocol/state sharing and selective UI sharing.
- "Landing page" was resolved as frozen and out of scope.
- "WebUI" was resolved as separate from the landing page and still in scope for completion.
- "Setup" was resolved as the Offdex CLI's responsibility, including Codex App Server lifecycle and pairing presentation.
- "Web" was resolved into **Offdex Web** for the Next.js surface and **Offdex WebUI** for the browser/PWA Codex client.
- "Mobile/WebUI parity" was resolved as a shared Codex client layer plus platform-specific presentation.
