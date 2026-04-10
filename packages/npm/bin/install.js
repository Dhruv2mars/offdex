#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  installRuntime,
  resolvePackageVersion,
  shouldReportProgress,
  shouldSkipPackageInstall,
  supportedPlatformList
} from "./install-lib.js";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, "..");
const packageVersion = resolvePackageVersion(join(packageRoot, "package.json"), process.env);
const colorEnabled =
  Boolean(process.stderr.isTTY) &&
  process.env.NO_COLOR !== "1" &&
  process.env.NO_COLOR !== "true" &&
  process.env.TERM !== "dumb";
const paint = (code, text) => colorEnabled ? `\u001b[${code}m${text}\u001b[0m` : text;
const shipRed = (text) => paint("38;2;255;91;79", text);
const muted = (text) => paint("38;2;136;136;136", text);
const white = (text) => paint("38;2;255;255;255", text);
const bold = (text) => paint("1", text);

const S_STEP = bold("◆");
const S_BAR = muted("│");
const S_END = muted("└");
const S_ERR = shipRed("▲");

function title(text) {
  return `${S_STEP} ${bold(white(text))}`;
}

function alertTitle(text) {
  return `${S_ERR} ${bold(shipRed(text))}`;
}

function row(label, value) {
  return `${S_BAR} ${muted(label.padEnd(8))} ${white(value)}`;
}

if (shouldSkipPackageInstall({ env: process.env, packageRoot })) {
  console.log([title("Offdex setup"), row("Runtime", "workspace checkout; native install skipped"), `${S_END}`].join("\n"));
  process.exit(0);
}

let lastPercent = -10;

installRuntime({
  version: packageVersion,
  onProgress({ receivedBytes, totalBytes }) {
    if (!shouldReportProgress({ receivedBytes, totalBytes, lastPercent })) {
      return;
    }

    lastPercent = Math.floor((receivedBytes / totalBytes) * 100);
    console.error(
      row("Download", `native runtime ${lastPercent}% (${Math.round(receivedBytes / 1024 / 1024)}MB/${Math.round(totalBytes / 1024 / 1024)}MB)`)
    );
  },
})
  .then(({ installBin }) => {
    console.log([title("Offdex installed"), row("Runtime", installBin), `${S_END}`].join("\n"));
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : "unknown";
    console.error([alertTitle("Install failed"), row("Reason", message)].join("\n"));
    if (typeof message === "string" && message.startsWith("unsupported_platform:")) {
      console.error(row("Targets", supportedPlatformList().join(", ")));
    }
    console.error(`${S_END}`);
    process.exit(1);
  });
