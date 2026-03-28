#!/usr/bin/env bun

import { startRelayServer } from "./index";

const port = Number(process.env.OFFDEX_RELAY_PORT || "42421");
const host = process.env.OFFDEX_RELAY_HOST || "127.0.0.1";

const relay = startRelayServer({ host, port });

console.log(`[offdex-relay] listening on http://${host}:${port}`);

process.on("SIGINT", () => {
  relay.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  relay.stop();
  process.exit(0);
});
