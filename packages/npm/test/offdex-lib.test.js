import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { resolveWorkspaceBridgeCli } from "../bin/offdex-lib.js";

const repoRoot = join(import.meta.dirname, "..", "..", "..");

test("npm wrapper falls back to the source bridge CLI inside a workspace checkout", () => {
  const bridgeCli = resolveWorkspaceBridgeCli(
    new URL("../bin/offdex-lib.js", import.meta.url).href
  );

  assert.equal(bridgeCli, join(repoRoot, "packages", "bridge", "src", "cli.ts"));
});

test("npm wrapper help works inside a workspace checkout without a native runtime", () => {
  const installRoot = mkdtempSync(join(tmpdir(), "offdex-empty-runtime-"));
  const result = spawnSync(
    process.execPath,
    [join(repoRoot, "packages", "npm", "bin", "offdex.js"), "--help"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        OFFDEX_INSTALL_ROOT: installRoot,
      },
    }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Offdex CLI/);
  assert.match(result.stdout, /offdex bridge/);
});

test("npm wrapper help works in an installed package without downloading runtime", () => {
  const packageRoot = mkdtempSync(join(tmpdir(), "offdex-installed-package-"));
  const installRoot = mkdtempSync(join(tmpdir(), "offdex-empty-runtime-"));
  cpSync(join(repoRoot, "packages", "npm", "bin"), join(packageRoot, "bin"), {
    recursive: true,
  });
  writeFileSync(
    join(packageRoot, "package.json"),
    JSON.stringify({ name: "@dhruv2mars/offdex", version: "0.0.4", type: "module" })
  );

  const result = spawnSync(
    process.execPath,
    [join(packageRoot, "bin", "offdex.js"), "--help"],
    {
      cwd: packageRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        OFFDEX_INSTALL_ROOT: installRoot,
        OFFDEX_RELEASE_BASE_URL: "http://127.0.0.1:1/offline",
      },
    }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Offdex CLI/);
  assert.match(result.stdout, /offdex bridge/);
  assert.doesNotMatch(result.stderr, /setting up native runtime/);
});
