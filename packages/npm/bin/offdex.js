#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import {
  installedVersion,
  readPackageVersion,
  resolveInstalledBin,
  resolvePackageBinDir,
  resolveWorkspaceBridgeCli,
  shouldInstallBinary
} from "./offdex-lib.js";

const args = process.argv.slice(2);
const colorEnabled =
  Boolean(process.stdout.isTTY) &&
  process.env.NO_COLOR !== "1" &&
  process.env.NO_COLOR !== "true" &&
  process.env.TERM !== "dumb";
const paint = (code, text) => colorEnabled ? `\u001b[${code}m${text}\u001b[0m` : text;
const green = (text) => paint("38;2;16;163;127", text);
const muted = (text) => paint("38;2;156;163;160", text);
const bold = (text) => paint("1", text);
const command = (text) => paint("38;2;225;229;226", text);
const link = (text) => paint("38;2;203;255;229", text);

function onboardingText() {
  return [
    bold(green("Offdex")),
    muted("Codex mobile app."),
    "",
    "Use Codex from your phone while the real Codex session keeps running on this Mac.",
    "",
    green("Get started"),
    `  1. Run ${command("offdex start")}`,
    "  2. Open Offdex on your phone.",
    "  3. Scan the QR from this terminal.",
    "  4. Send a prompt and watch Codex reply live.",
    "",
    green("Core commands"),
    `  ${command("offdex help")}       Commands, docs, GitHub, feedback.`,
    `  ${command("offdex start")}      Start the bridge and show the QR.`,
    `  ${command("offdex status")}     Show bridge, Codex, and client status.`,
    `  ${command("offdex stop")}       Stop the local bridge.`,
    "",
    `Docs: ${link("https://offdexapp.vercel.app")}`,
  ].join("\n");
}

function helpText() {
  return [
    bold(green("Offdex help")),
    muted("Codex mobile app."),
    "",
    green("Commands"),
    `  ${command("offdex")}`,
    "      Open the Offdex home screen.",
    "",
    `  ${command("offdex help")}`,
    "      Show commands, docs, and support links.",
    "",
    `  ${command("offdex start")} ${muted("[options]")}`,
    "      Start the bridge and show the pairing QR.",
    "",
    `  ${command("offdex status")} ${muted("[options]")}`,
    "      Show bridge, Codex, client, and remote status.",
    "",
    `  ${command("offdex stop")} ${muted("[options]")}`,
    "      Stop the local bridge started by Offdex.",
    "",
    green("Start options"),
    `  ${command("--host <host>")}                 Default: 0.0.0.0`,
    `  ${command("--port <port>")}                 Default: 42420`,
    `  ${command("--mode <codex|demo>")}           Default: codex`,
    `  ${command("--control-plane-url <url>")}     Enable managed remote pairing.`,
    "",
    green("Environment fallbacks"),
    `  ${command("OFFDEX_BRIDGE_HOST")}`,
    `  ${command("OFFDEX_BRIDGE_PORT")}`,
    `  ${command("OFFDEX_BRIDGE_MODE")}`,
    `  ${command("OFFDEX_CONTROL_PLANE_URL")}`,
    "",
    green("Links"),
    `  Docs:     ${link("https://offdexapp.vercel.app")}`,
    `  GitHub:   ${link("https://github.com/Dhruv2mars/offdex")}`,
    `  Feedback: ${link("https://github.com/Dhruv2mars/offdex/issues")}`,
  ].join("\n");
}

function offlineText() {
  return [
    bold("Offdex is not running"),
    `Start it with: ${command("offdex start")}`,
  ].join("\n");
}

function commandName(argv) {
  return argv[0] ?? "onboarding";
}

function canAnswerWithoutRuntime(argv) {
  const name = commandName(argv);
  return (
    argv.length === 0 ||
    name === "help" ||
    name === "--help" ||
    name === "-h" ||
    name === "status" ||
    name === "stop"
  );
}

const installedBin = resolveInstalledBin(process.env, process.platform);
const packageVersion = readPackageVersion();
const currentInstalledVersion = installedVersion(process.env);
const workspaceBridgeCli = resolveWorkspaceBridgeCli();

if (!existsSync(installedBin) && args.length === 0) {
  console.log(onboardingText());
  process.exit(0);
}

if (
  !existsSync(installedBin) &&
  (args[0] === "help" || args[0] === "--help" || args[0] === "-h")
) {
  console.log(helpText());
  process.exit(0);
}

if (workspaceBridgeCli && !existsSync(installedBin)) {
  const result = spawnSync("bun", [workspaceBridgeCli, ...args], {
    stdio: "inherit",
    env: process.env
  });
  process.exit(result.status ?? 1);
}

if (!existsSync(installedBin) && args[0] === "status") {
  console.log(offlineText());
  process.exit(1);
}

if (!existsSync(installedBin) && args[0] === "stop") {
  console.log(offlineText());
  process.exit(0);
}

if (
  !canAnswerWithoutRuntime(args) &&
  shouldInstallBinary({
    binExists: existsSync(installedBin),
    installedVersion: currentInstalledVersion,
    packageVersion
  })
) {
  console.error("offdex: setting up native runtime...");
  const here = resolvePackageBinDir(import.meta.url);
  const installer = join(here, "install.js");
  const install = spawnSync(process.execPath, [installer], {
    stdio: "inherit",
    env: process.env
  });
  if (install.status !== 0 || !existsSync(installedBin)) {
    console.error("offdex: install missing. try reinstall: npm i -g @dhruv2mars/offdex");
    process.exit(1);
  }
}

const result = spawnSync(installedBin, args, {
  stdio: "inherit",
  env: process.env
});
process.exit(result.status ?? 1);
