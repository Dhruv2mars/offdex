#!/usr/bin/env bun

import { decodePairingUri } from "@offdex/protocol";
import { parseArgs, usage } from "./cli-lib";
import { createBridgeStartupOutput, startBridgeServer } from "./index";

function printUsageAndExit(code = 0): never {
  const output = usage();
  if (code === 0) {
    console.log(output);
  } else {
    console.error(output);
  }
  process.exit(code);
}

const options = (() => {
  try {
    return parseArgs();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error(`offdex: ${message}`);
    printUsageAndExit(1);
  }
})();

if (options.command === "help") {
  printUsageAndExit(0);
}

const bridge = startBridgeServer({
  host: options.host,
  port: options.port,
  bridgeMode: options.bridgeMode,
  controlPlaneUrl: options.controlPlaneUrl,
});

console.log(`[offdex-bridge] listening on http://${options.host}:${options.port}`);
void (async () => {
  let payload = bridge.getPairingPayload();

  if (options.controlPlaneUrl) {
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
    relayUrl: options.controlPlaneUrl ?? bridge.bridgeState.relayUrl,
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
