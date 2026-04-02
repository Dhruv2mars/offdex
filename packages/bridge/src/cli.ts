#!/usr/bin/env bun

import { createBridgeStartupOutput, startBridgeServer } from "./index";

const port = Number(process.env.OFFDEX_BRIDGE_PORT || "42420");
const host = process.env.OFFDEX_BRIDGE_HOST || "0.0.0.0";
const bridgeMode = (process.env.OFFDEX_BRIDGE_MODE || "codex") as "demo" | "codex";

const bridge = startBridgeServer({ host, port, bridgeMode });

console.log(`[offdex-bridge] listening on http://${host}:${port}`);
void createBridgeStartupOutput({
  payload: bridge.getPairingPayload(),
  relayUrl: bridge.bridgeState.relayUrl,
}).then((output) => {
  console.log(output);
});

process.on("SIGINT", () => {
  bridge.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  bridge.stop();
  process.exit(0);
});
