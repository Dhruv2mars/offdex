import test from "node:test";
import assert from "node:assert/strict";

import {
  assertSupportedPlatform,
  isSupportedPlatform,
  supportedPlatformList,
  targetForPlatform,
} from "../bin/install-lib.js";

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
