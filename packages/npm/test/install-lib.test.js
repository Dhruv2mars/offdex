import test from "node:test";
import assert from "node:assert/strict";

import {
  assertSupportedPlatform,
  isSupportedPlatform,
  isWorkspaceCheckout,
  shouldSkipPackageInstall,
  supportedPlatformList,
  targetForPlatform,
} from "../bin/install-lib.js";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("npm installer supports the expected public targets", () => {
  assert.deepEqual(supportedPlatformList(), [
    "darwin/arm64",
    "darwin/x64",
    "linux/arm64",
    "linux/x64",
    "win32/x64"
  ]);
  assert.equal(isSupportedPlatform("darwin", "arm64"), true);
  assert.equal(isSupportedPlatform("darwin", "x64"), true);
  assert.equal(isSupportedPlatform("linux", "arm64"), true);
  assert.equal(isSupportedPlatform("linux", "x64"), true);
  assert.equal(isSupportedPlatform("win32", "x64"), true);
});

test("npm installer rejects unsupported targets clearly", () => {
  assert.throws(
    () => assertSupportedPlatform("win32", "arm64"),
    /unsupported_platform:win32-arm64/
  );
  assert.equal(isSupportedPlatform("win32", "arm64"), false);
});

test("npm installer exposes the compile target for supported platforms", () => {
  assert.equal(targetForPlatform("darwin", "arm64"), "bun-darwin-arm64");
  assert.equal(targetForPlatform("darwin", "x64"), "bun-darwin-x64");
  assert.equal(targetForPlatform("linux", "arm64"), "bun-linux-arm64");
  assert.equal(targetForPlatform("linux", "x64"), "bun-linux-x64-baseline");
  assert.equal(targetForPlatform("win32", "x64"), "bun-windows-x64-baseline");
});

test("npm installer skips native runtime download inside the monorepo workspace", () => {
  const root = mkdtempSync(join(tmpdir(), "offdex-workspace-"));
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "offdex", workspaces: ["apps/*", "packages/*"] })
  );

  assert.equal(isWorkspaceCheckout(join(root, "package.json")), true);
  assert.equal(
    shouldSkipPackageInstall({
      packageRoot: join(root, "packages", "npm"),
      env: {},
    }),
    true
  );
});

test("npm installer can be explicitly skipped by environment", () => {
  assert.equal(
    shouldSkipPackageInstall({
      packageRoot: "/tmp/offdex-package",
      env: { OFFDEX_SKIP_INSTALL: "1" },
    }),
    true
  );
});
