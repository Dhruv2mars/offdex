#!/usr/bin/env bun

import { decodePairingUri } from "@offdex/protocol";
import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
  createDaemonLaunchPlan,
  formatBridgeStatus,
  formatOfflineStatus,
  formatStaleStatus,
  formatStoppedStatus,
  onboarding,
  parseArgs,
  usage,
  type CliOptions,
} from "./cli-lib";
import { createBridgeStartupOutput, startBridgeServer, type BridgePairingPayload } from "./index";

const DAEMON_CHILD_ENV = "OFFDEX_BRIDGE_DAEMON_CHILD";

function shouldAnimate() {
  return Boolean(process.stdout.isTTY) &&
    process.env.CI !== "true" &&
    process.env.NO_COLOR !== "1" &&
    process.env.NO_COLOR !== "true";
}

import { MASCOT_IDLE, MASCOT_BLINK } from "./mascot";

function createStartupSpinner(label: string) {
  if (!shouldAnimate()) {
    return { stop() {} };
  }

  const frames = [MASCOT_IDLE, MASCOT_IDLE, MASCOT_IDLE, MASCOT_BLINK];
  let index = 0;
  
  const renderFrame = (frameStr: string) => {
    const lines = frameStr.split("\n");
    lines.forEach(line => process.stdout.write(line + "\n"));
    process.stdout.write(`\u001b[38;2;10;114;239m⠋\u001b[0m ${label}\n`);
  };

  const clearFrame = (frameStr: string) => {
    const lines = frameStr.split("\n");
    // Move cursor up by the number of lines + 1 (for the label)
    process.stdout.write(`\u001b[${lines.length + 1}A`);
    // Clear lines
    for (let i = 0; i < lines.length + 1; i++) {
      process.stdout.write(`\u001b[2K\n`);
    }
    // Move cursor back up
    process.stdout.write(`\u001b[${lines.length + 1}A`);
  };

  renderFrame(frames[index]);

  const timer = setInterval(() => {
    clearFrame(frames[index]);
    index = (index + 1) % frames.length;
    renderFrame(frames[index]);
  }, 400);

  return {
    stop() {
      clearInterval(timer);
      clearFrame(frames[index]);
    },
  };
}

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

function runLogPath() {
  return join(homedir(), ".offdex", "bridge.log");
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

async function readPairingPayload(baseUrl: string): Promise<BridgePairingPayload> {
  const response = await fetch(`${baseUrl}/pairing.json`);
  if (!response.ok) {
    throw new Error(`pairing_status:${response.status}`);
  }
  return response.json() as Promise<BridgePairingPayload>;
}

async function waitForPairingPayload(baseUrl: string, timeoutMs = 5_000) {
  const startedAt = Date.now();
  let lastError: unknown = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await readPairingPayload(baseUrl);
    } catch (error) {
      lastError = error;
      await Bun.sleep(150);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("bridge_start_timeout");
}

async function createStartupOutput(baseUrl: string, relayUrl: string | null) {
  const payload = await waitForPairingPayload(baseUrl);
  return createBridgeStartupOutput({
    payload,
    relayUrl,
  });
}

async function printStartupOutput(baseUrl: string, relayUrl: string | null) {
  console.log(await createStartupOutput(baseUrl, relayUrl));
}

async function startDetachedBridgeAndExit(options: CliOptions): Promise<never> {
  if (options.port === 0) {
    console.error("offdex: background start needs an explicit port");
    process.exit(1);
  }

  const existingState = readRunState();
  const baseUrl = localBridgeUrl(options, existingState);
  if (existingState && processIsRunning(existingState.pid)) {
    try {
      await printStartupOutput(baseUrl, options.controlPlaneUrl ?? null);
      process.exit(0);
    } catch {
      removeRunState();
    }
  }

  const logPath = runLogPath();
  mkdirSync(dirname(logPath), { recursive: true });
  const logFd = openSync(logPath, "a");
  const launch = createDaemonLaunchPlan({
    argv: process.argv,
    execPath: process.execPath,
  });

  try {
    const child = spawn(launch.command, launch.args, {
      detached: true,
      stdio: ["ignore", logFd, logFd],
      env: {
        ...process.env,
        [DAEMON_CHILD_ENV]: "1",
      },
    });
    child.unref();
  } finally {
    closeSync(logFd);
  }

  const spinner = createStartupSpinner("Starting Offdex bridge");
  try {
    const output = await createStartupOutput(localBridgeUrl(options, null), options.controlPlaneUrl ?? null);
    spinner.stop();
    console.log(output);
    process.exit(0);
  } catch (error) {
    spinner.stop();
    console.error("offdex: bridge did not start cleanly");
    console.error(`offdex: see log at ${logPath}`);
    if (error instanceof Error) {
      console.error(`offdex: ${error.message}`);
    }
    process.exit(1);
  }
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
      liveClientCount?: number;
      relayConnected?: boolean;
      relayUrl?: string | null;
    };
    console.log(formatBridgeStatus({ baseUrl, state, health }));
    process.exit(0);
  } catch {
    if (state && !processIsRunning(state.pid)) {
      removeRunState();
    }
    console.log(formatOfflineStatus());
    process.exit(1);
  }
}

async function stopBridgeAndExit(options: CliOptions): Promise<never> {
  const state = readRunState();
  if (!state) {
    console.log(formatOfflineStatus());
    process.exit(0);
  }

  if (!processIsRunning(state.pid)) {
    removeRunState();
    console.log(formatStaleStatus());
    process.exit(0);
  }

  if (state.pid === process.pid) {
    console.error("offdex: refusing to stop the current CLI process");
    process.exit(1);
  }

  process.kill(state.pid, "SIGTERM");
  removeRunState();
  console.log(formatStoppedStatus(localBridgeUrl(options, state)));
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

if (process.env[DAEMON_CHILD_ENV] !== "1") {
  await startDetachedBridgeAndExit(options);
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

if (process.env[DAEMON_CHILD_ENV] === "1") {
  console.log(`Offdex bridge daemon running on ${localBridgeUrl(options, null)}`);
} else {
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
}

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
