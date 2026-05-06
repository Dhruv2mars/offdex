# CLI owns Codex App Server lifecycle

The Offdex CLI owns setup and runtime lifecycle: it verifies Codex availability, starts Codex App Server, starts the Offdex bridge, and presents pairing. Mobile and web clients connect to the bridge and do not launch or configure Codex directly, keeping client code focused on trusted Codex interaction instead of machine setup.
