#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { installRuntime, resolvePackageVersion } from "./install-lib.js";

const here = dirname(fileURLToPath(import.meta.url));
const packageVersion = resolvePackageVersion(join(here, "..", "package.json"), process.env);

installRuntime({ version: packageVersion })
  .then(({ installBin }) => {
    console.log(`offdex: installed ${installBin}`);
  })
  .catch((error) => {
    console.error(`offdex: install failed (${error instanceof Error ? error.message : "unknown"})`);
    process.exit(1);
  });
