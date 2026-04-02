#!/usr/bin/env bun

import { decodePairingUri } from "@offdex/protocol";
import { createBridgeStartupOutput, startBridgeServer } from "./index";

const port = Number(process.env.OFFDEX_BRIDGE_PORT || "42420");
const host = process.env.OFFDEX_BRIDGE_HOST || "0.0.0.0";
const bridgeMode = (process.env.OFFDEX_BRIDGE_MODE || "codex") as "demo" | "codex";
const controlPlaneUrl = process.env.OFFDEX_CONTROL_PLANE_URL || undefined;

const bridge = startBridgeServer({ host, port, bridgeMode, controlPlaneUrl });

console.log(`[offdex-bridge] listening on http://${host}:${port}`);
void (async () => {
  let payload = bridge.getPairingPayload();

  if (controlPlaneUrl) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (decodePairingUri(payload.pairingUri).version === 3) {
        break;
      }

      await Bun.sleep(200);
      payload = bridge.getPairingPayload();
    }
  }

  const output = await createBridgeStartupOutput({
    payload,
    relayUrl: controlPlaneUrl ?? bridge.bridgeState.relayUrl,
  });
  console.log(output);
})();

process.on("SIGINT", () => {
  bridge.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  bridge.stop();
  process.exit(0);
});
