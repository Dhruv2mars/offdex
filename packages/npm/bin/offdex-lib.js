import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  isWorkspaceCheckout,
  readInstalledVersion,
  resolveInstalledBin,
  shouldInstallBinary
} from "./install-lib.js";

export function resolvePackageBinDir(moduleUrl = import.meta.url) {
  return dirname(fileURLToPath(moduleUrl));
}

export function readPackageVersion(moduleUrl = import.meta.url) {
  const binDir = resolvePackageBinDir(moduleUrl);
  const packageJsonPath = join(binDir, "..", "package.json");
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  return pkg.version;
}

export function installedVersion(env = process.env) {
  return readInstalledVersion(env);
}

export function resolveWorkspaceBridgeCli(moduleUrl = import.meta.url) {
  const binDir = resolvePackageBinDir(moduleUrl);
  const packageRoot = join(binDir, "..");
  const workspaceRootPackageJson = join(packageRoot, "..", "..", "package.json");
  if (!isWorkspaceCheckout(workspaceRootPackageJson)) {
    return null;
  }

  const bridgeCli = join(packageRoot, "..", "bridge", "src", "cli.ts");
  return existsSync(bridgeCli) ? bridgeCli : null;
}

export { resolveInstalledBin, shouldInstallBinary };
