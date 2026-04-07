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

if (shouldSkipPackageInstall({ env: process.env, packageRoot })) {
  console.log("offdex: skipping native runtime install inside workspace checkout");
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
      `offdex: downloading native runtime ${lastPercent}% (${Math.round(receivedBytes / 1024 / 1024)}MB/${Math.round(totalBytes / 1024 / 1024)}MB)`
    );
  },
})
  .then(({ installBin }) => {
    console.log(`offdex: installed ${installBin}`);
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : "unknown";
    console.error(`offdex: install failed (${message})`);
    if (typeof message === "string" && message.startsWith("unsupported_platform:")) {
      console.error(`offdex: supported targets are ${supportedPlatformList().join(", ")}`);
    }
    process.exit(1);
  });
