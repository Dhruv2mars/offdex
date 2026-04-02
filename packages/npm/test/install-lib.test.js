import test from "node:test";
import assert from "node:assert/strict";

import {
  assertSupportedPlatform,
  isSupportedPlatform,
  supportedPlatformList
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
