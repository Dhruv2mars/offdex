# Use Codex App Server as the engine interface

Offdex will build on top of Codex App Server only, using its official local JSON-RPC interface as the Codex engine boundary. This keeps Offdex aligned with official rich Codex clients and avoids terminal scraping, custom Codex engine behavior, or direct model API replacement paths that would drift from Codex product semantics.
