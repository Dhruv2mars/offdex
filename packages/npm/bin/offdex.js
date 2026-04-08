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
const ONBOARDING_TEXT = `Offdex
Codex mobile app.

Use Codex from your phone while the real Codex session keeps running on this Mac.

Get started:
  1. Run: offdex start
  2. Open Offdex on your phone.
  3. Scan the QR from this terminal.
  4. Send a prompt and watch Codex reply live.

Core commands:
  offdex help       Commands, docs, GitHub, feedback.
  offdex start      Start the bridge and show the QR.
  offdex status     Show bridge, Codex, and client status.
  offdex stop       Stop the local bridge.

Docs: https://offdexapp.vercel.app
`;
const HELP_TEXT = `Offdex help
Codex mobile app.

Commands:
  offdex
      Open the Offdex home screen.

  offdex help
      Show commands, docs, and support links.

  offdex start [options]
      Start the bridge and show the pairing QR.

  offdex status [options]
      Show bridge, Codex, client, and remote status.

  offdex stop [options]
      Stop the local bridge started by Offdex.

Start options:
  --host <host>                 Default: 0.0.0.0
  --port <port>                 Default: 42420
  --mode <codex|demo>           Default: codex
  --control-plane-url <url>     Enable managed remote pairing.

Environment fallbacks:
  OFFDEX_BRIDGE_HOST
  OFFDEX_BRIDGE_PORT
  OFFDEX_BRIDGE_MODE
  OFFDEX_CONTROL_PLANE_URL

Links:
  Docs:     https://offdexapp.vercel.app
  GitHub:   https://github.com/Dhruv2mars/offdex
  Feedback: https://github.com/Dhruv2mars/offdex/issues
`;
const installedBin = resolveInstalledBin(process.env, process.platform);
const packageVersion = readPackageVersion();
const currentInstalledVersion = installedVersion(process.env);
const workspaceBridgeCli = resolveWorkspaceBridgeCli();

if (!existsSync(installedBin) && args.length === 0) {
  console.log(ONBOARDING_TEXT);
  process.exit(0);
}

if (
  !existsSync(installedBin) &&
  (args[0] === "help" || args[0] === "--help" || args[0] === "-h")
) {
  console.log(HELP_TEXT);
  process.exit(0);
}

if (workspaceBridgeCli && !existsSync(installedBin)) {
  const result = spawnSync("bun", [workspaceBridgeCli, ...args], {
    stdio: "inherit",
    env: process.env
  });
  process.exit(result.status ?? 1);
}

if (
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
