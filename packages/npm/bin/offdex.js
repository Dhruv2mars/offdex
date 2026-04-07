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
const installedBin = resolveInstalledBin(process.env, process.platform);
const packageVersion = readPackageVersion();
const currentInstalledVersion = installedVersion(process.env);
const workspaceBridgeCli = resolveWorkspaceBridgeCli();

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
