import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
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
