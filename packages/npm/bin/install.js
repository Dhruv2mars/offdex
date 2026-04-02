#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { installRuntime, resolvePackageVersion, supportedPlatformList } from "./install-lib.js";

const here = dirname(fileURLToPath(import.meta.url));
const packageVersion = resolvePackageVersion(join(here, "..", "package.json"), process.env);

installRuntime({ version: packageVersion })
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
