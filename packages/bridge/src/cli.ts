#!/usr/bin/env bun

import { decodePairingUri } from "@offdex/protocol";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { onboarding, parseArgs, usage, type CliOptions } from "./cli-lib";
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

type BridgeRunState = {
  pid: number;
  host: string;
  port: number;
  startedAt: string;
};

function runStatePath() {
  return join(homedir(), ".offdex", "bridge-run.json");
}

function writeRunState(state: BridgeRunState) {
  const path = runStatePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2));
}

function readRunState(): BridgeRunState | null {
  try {
    return JSON.parse(readFileSync(runStatePath(), "utf8")) as BridgeRunState;
  } catch {
    return null;
  }
}

function removeRunState() {
  rmSync(runStatePath(), { force: true });
}

function processIsRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function localBridgeUrl(options: CliOptions, state: BridgeRunState | null) {
  const host = state?.host && state.host !== "0.0.0.0" ? state.host : options.host;
  const normalizedHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  return `http://${normalizedHost}:${state?.port ?? options.port}`;
}

async function printStatusAndExit(options: CliOptions): Promise<never> {
  const state = readRunState();
  const baseUrl = localBridgeUrl(options, state);
  try {
    const response = await fetch(`${baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`bad_status:${response.status}`);
    }

    const health = await response.json() as {
      macName?: string;
      codexConnected?: boolean;
      codexAccount?: { plan?: string | null; email?: string | null } | null;
      bridgeMode?: string;
    };
    console.log("Offdex is running");
    console.log(`Local URL: ${baseUrl}`);
    if (health.macName) console.log(`Machine: ${health.macName}`);
    console.log(`Runtime: ${health.bridgeMode ?? "codex"}`);
    console.log(
      health.codexConnected
        ? `Codex: signed in${health.codexAccount?.email ? ` as ${health.codexAccount.email}` : ""}`
        : "Codex: not signed in on this Mac"
    );
    process.exit(0);
  } catch {
    if (state && !processIsRunning(state.pid)) {
      removeRunState();
    }
    console.log("Offdex is not running");
    console.log("Start it with: offdex start");
    process.exit(1);
  }
}

async function stopBridgeAndExit(options: CliOptions): Promise<never> {
  const state = readRunState();
  if (!state) {
    console.log("Offdex is not running");
    console.log("Start it with: offdex start");
    process.exit(0);
  }

  if (!processIsRunning(state.pid)) {
    removeRunState();
    console.log("Offdex was not running. Removed stale local state.");
    process.exit(0);
  }

  if (state.pid === process.pid) {
    console.error("offdex: refusing to stop the current CLI process");
    process.exit(1);
  }

  process.kill(state.pid, "SIGTERM");
  removeRunState();
  console.log(`Stopped Offdex on ${localBridgeUrl(options, state)}`);
  process.exit(0);
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

if (options.command === "onboarding") {
  console.log(onboarding());
  process.exit(0);
}

if (options.command === "help") {
  printUsageAndExit(0);
}

if (options.command === "status") {
  await printStatusAndExit(options);
}

if (options.command === "stop") {
  await stopBridgeAndExit(options);
}

if (options.deprecatedBridgeAlias) {
  console.error("offdex: `offdex bridge` is deprecated. Use `offdex start`.");
}

const bridge = startBridgeServer({
  host: options.host,
  port: options.port,
  bridgeMode: options.bridgeMode,
  controlPlaneUrl: options.controlPlaneUrl,
});

writeRunState({
  pid: process.pid,
  host: options.host,
  port: bridge.server.port ?? options.port,
  startedAt: new Date().toISOString(),
});

console.log(`[offdex] started on http://${options.host}:${bridge.server.port ?? options.port}`);
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
  removeRunState();
  bridge.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  removeRunState();
  bridge.stop();
  process.exit(0);
});
