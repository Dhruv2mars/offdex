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
const developBlue = (text) => paint("38;2;10;114;239", text);
const previewPink = (text) => paint("38;2;222;29;141", text);
const shipRed = (text) => paint("38;2;255;91;79", text);
const muted = (text) => paint("38;2;136;136;136", text);
const white = (text) => paint("38;2;255;255;255", text);
const bold = (text) => paint("1", text);
const bgBlue = (text) => paint("48;2;10;114;239;38;2;255;255;255;1", ` ${text} `);
const bgRed = (text) => paint("48;2;255;91;79;38;2;255;255;255;1", ` ${text} `);

const S_STEP = developBlue("◆");
const S_BAR = muted("│");
const S_END = muted("└");
const S_ERR = shipRed("▲");

const controlPlaneUrl = "https://offdex-control-plane.dhruv-sharma10102005.workers.dev";

const mascotGrid = [
  "........................",
  "........................",
  "........................",
  "........................",
  "........#######.........",
  "......###########.......",
  ".....#############......",
  "....###############.....",
  "...#################....",
  "...############..###....",
  "..#####...###..######...",
  "..#####...###..######...",
  "..######.#####..#####...",
  "..###################...",
  "..###################...",
  "..###################...",
  "..#####.........#####...",
  "..#####.........#####...",
  "..#####.........#####...",
  "..#####.........#####...",
  "........................",
  "........................",
  "........................",
  "........................",
];

function mascotBanner() {
  const c = "38;2;64;64;64";
  return [
    ...mascotGrid.map((row) =>
      [...row].map((cell) => cell === "#" ? paint(c, "██") : "  ").join("")
    ),
    ""
  ].join("\n");
}

function title(text) {
  return `${S_STEP} ${bold(text)}`;
}

function alertTitle(text) {
  return `${S_ERR} ${bold(text)}`;
}

function section(text) {
  return `${S_BAR}\n${developBlue("◇")} ${bold(text)}`;
}

function row(label, value) {
  return `${S_BAR} ${muted(label.padEnd(8))} ${white(value)}`;
}

function commandRow(commandText, description) {
  return `${S_BAR} ${developBlue(commandText.padEnd(28))} ${muted(description)}`;
}

function optionRow(option, description) {
  if (!description) {
    return `${S_BAR}   ${developBlue(option)}`;
  }
  return `${S_BAR}   ${developBlue(option.padEnd(34))} ${muted(description)}`;
}

function onboardingText() {
  return [
    mascotBanner(),
    `${S_STEP} ${bgBlue("OFFDEX")}`,
    `${S_BAR} Use Codex from your phone.`,
    section("Get started"),
    `${S_BAR} ${muted("1.")} ${developBlue("offdex start")}        Start the bridge on this Mac.`,
    `${S_BAR} ${muted("2.")} Open Offdex on your phone.`,
    `${S_BAR} ${muted("3.")} Scan the QR from this terminal.`,
    `${S_BAR} ${muted("4.")} Send a prompt and watch Codex reply live.`,
    section("Core commands"),
    commandRow("offdex help", "Commands, docs, GitHub, feedback."),
    commandRow("offdex start", "Start the bridge and show the QR."),
    commandRow("offdex status", "Show bridge, Codex, and client status."),
    commandRow("offdex stop", "Stop the local bridge."),
    `${S_BAR}`,
    `${S_END} Docs: ${previewPink("https://offdexapp.vercel.app")}`,
  ].join("\n");
}

function helpText() {
  return [
    mascotBanner(),
    `${S_STEP} ${bgBlue("OFFDEX HELP")}`,
    `${S_BAR} Use Codex from your phone.`,
    section("Commands"),
    commandRow("offdex", "Open the Offdex home screen."),
    commandRow("offdex help", "Show commands, docs, and support links."),
    commandRow("offdex start [options]", "Start the bridge and show the pairing QR."),
    commandRow("offdex status [options]", "Show bridge, Codex, client, and remote status."),
    commandRow("offdex stop [options]", "Stop the local bridge started by Offdex."),
    section("Start options"),
    optionRow("--host <host>", "Default: 0.0.0.0"),
    optionRow("--port <port>", "Default: 42420"),
    optionRow("--mode <codex|demo>", "Default: codex"),
    optionRow("--control-plane-url <url>", "Override managed remote pairing."),
    section("Environment fallbacks"),
    optionRow("OFFDEX_BRIDGE_HOST", ""),
    optionRow("OFFDEX_BRIDGE_PORT", ""),
    optionRow("OFFDEX_BRIDGE_MODE", ""),
    optionRow("OFFDEX_CONTROL_PLANE_URL", `Default: ${controlPlaneUrl}`),
    `${S_BAR}`,
    `${S_BAR} Docs:     ${previewPink("https://offdexapp.vercel.app")}`,
    `${S_BAR} GitHub:   ${previewPink("https://github.com/Dhruv2mars/offdex")}`,
    `${S_END} Feedback: ${previewPink("https://github.com/Dhruv2mars/offdex/issues")}`,
  ].join("\n");
}

function offlineText() {
  return [
    `${S_ERR} ${bgRed("OFFDEX IS NOT RUNNING")}`,
    row("Next", developBlue("offdex start")),
    `${S_END}`
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
  console.error([title("Offdex setup"), row("Runtime", "installing native runtime")].join("\n"));
  const here = resolvePackageBinDir(import.meta.url);
  const installer = join(here, "install.js");
  const install = spawnSync(process.execPath, [installer], {
    stdio: "inherit",
    env: process.env
  });
  if (install.status !== 0 || !existsSync(installedBin)) {
    console.error([alertTitle("Install missing"), row("Retry", "npm i -g @dhruv2mars/offdex")].join("\n"));
    process.exit(1);
  }
}

const result = spawnSync(installedBin, args, {
  stdio: "inherit",
  env: process.env
});
process.exit(result.status ?? 1);
