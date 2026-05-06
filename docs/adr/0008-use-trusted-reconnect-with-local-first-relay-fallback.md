# Use trusted reconnect with local-first relay fallback

Offdex clients will pair once through QR/bootstrap, store trust securely, and reconnect automatically to the user's bridge until trust is revoked. Clients should prefer the local bridge when reachable and fall back to relay when local access is unavailable, while avoiding logs or UI leaks of bearer-like pairing and session identifiers.
