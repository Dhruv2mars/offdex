# Share Codex client layer across Mobile and WebUI

Offdex Mobile and Offdex WebUI will share one Codex client layer for Codex App Server protocol types, event normalization, reducers, approvals, diffs, and transport abstractions. This avoids duplicated protocol semantics and keeps mobile and browser behavior aligned while still allowing each surface to present workflows in platform-native ways.
