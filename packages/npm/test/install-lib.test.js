import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

import {
  assertSupportedPlatform,
  compressedAssetNameFor,
  installRuntime,
  isSupportedPlatform,
  isWorkspaceCheckout,
  shouldSkipPackageInstall,
  shouldReportProgress,
  supportedPlatformList,
  targetForPlatform,
} from "../bin/install-lib.js";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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

test("npm installer knows the compressed release asset name", () => {
  assert.equal(compressedAssetNameFor("darwin", "arm64"), "offdex-darwin-arm64.gz");
  assert.equal(compressedAssetNameFor("win32", "x64"), "offdex-win32-x64.exe.gz");
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

test("npm installer progress reports at useful percentage steps", () => {
  assert.equal(
    shouldReportProgress({ receivedBytes: 1, totalBytes: 100, lastPercent: -1 }),
    true
  );
  assert.equal(
    shouldReportProgress({ receivedBytes: 5, totalBytes: 100, lastPercent: 0 }),
    false
  );
  assert.equal(
    shouldReportProgress({ receivedBytes: 10, totalBytes: 100, lastPercent: 0 }),
    true
  );
  assert.equal(
    shouldReportProgress({ receivedBytes: 100, totalBytes: 100, lastPercent: 90 }),
    true
  );
});

test("npm installer prefers compressed runtime assets when the release publishes them", async () => {
  const home = mkdtempSync(join(tmpdir(), "offdex-runtime-home-"));
  const payload = Buffer.from("native runtime");
  const compressedPayload = gzipSync(payload);
  const compressedChecksum = createHash("sha256").update(compressedPayload).digest("hex");
  const requestedUrls = [];

  const result = await installRuntime({
    version: "0.0.6",
    platform: "darwin",
    arch: "arm64",
    home,
    env: { OFFDEX_RELEASE_BASE_URL: "https://example.test/offdex" },
    requestTextFn: async (url) => {
      requestedUrls.push(url);
      return `${compressedChecksum} *offdex-darwin-arm64.gz\n`;
    },
    downloadFn: async (url, outputPath) => {
      requestedUrls.push(url);
      writeFileSync(outputPath, compressedPayload);
    },
  });

  assert.equal(readFileSync(result.installBin, "utf8"), "native runtime");
  assert.equal(existsSync(join(home, ".offdex", "bin", "offdex")), true);
  assert.deepEqual(requestedUrls, [
    "https://example.test/offdex/checksums-darwin-arm64.txt",
    "https://example.test/offdex/offdex-darwin-arm64.gz",
  ]);
});
