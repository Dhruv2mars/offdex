import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { resolveWorkspaceBridgeCli } from "../bin/offdex-lib.js";

const repoRoot = join(import.meta.dirname, "..", "..", "..");
const expectedMascotGrid = [
  ".......##########.......",
  "......############......",
  ".....##############.....",
  "....############.###....",
  "...####...####..#####...",
  "...####...##..#######...",
  "...####...####..#####...",
  "...#############.####...",
  "...##################...",
  "...##################...",
  "...####..........####...",
  "...####..........####...",
];

function gridFromMascotOutput(stdout) {
  return stdout.split("\n").slice(1, 13).map((line) => {
    assert.equal(line.length, 48);
    return line.match(/.{2}/g).map((cell) => cell === "██" ? "#" : ".").join("");
  });
}

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
  assert.match(result.stdout, /OFFDEX HELP/);
  assert.match(result.stdout, /Use Codex from your phone/);
  assert.match(result.stdout, /Commands/);
  assert.match(result.stdout, /offdex start/);
  assert.match(result.stdout, /https:\/\/offdexapp\.vercel\.app/);
  assert.match(result.stdout, /https:\/\/github\.com\/Dhruv2mars\/offdex\/issues/);
  assert.doesNotMatch(result.stdout, /offdex bridge/);
});

test("npm wrapper shows onboarding for bare offdex without downloading runtime", () => {
  const installRoot = mkdtempSync(join(tmpdir(), "offdex-empty-runtime-"));
  const result = spawnSync(
    process.execPath,
    [join(repoRoot, "packages", "npm", "bin", "offdex.js")],
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
  assert.deepEqual(gridFromMascotOutput(result.stdout), expectedMascotGrid);
  assert.match(result.stdout, /OFFDEX/);
  assert.match(result.stdout, /Use Codex from your phone/);
  assert.match(result.stdout, /1\. offdex start/);
  assert.match(result.stdout, /offdex start/);
  assert.match(result.stdout, /Scan the QR/);
  assert.doesNotMatch(result.stdout, /Usage:/);
  assert.doesNotMatch(result.stderr, /setting up native runtime/);
});

test("npm wrapper help works in an installed package without downloading runtime", () => {
  const packageRoot = mkdtempSync(join(tmpdir(), "offdex-installed-package-"));
  const installRoot = mkdtempSync(join(tmpdir(), "offdex-empty-runtime-"));
  cpSync(join(repoRoot, "packages", "npm", "bin"), join(packageRoot, "bin"), {
    recursive: true,
  });
  writeFileSync(
    join(packageRoot, "package.json"),
    JSON.stringify({ name: "@dhruv2mars/offdex", version: "0.0.6", type: "module" })
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
  assert.match(result.stdout, /OFFDEX HELP/);
  assert.match(result.stdout, /Use Codex from your phone/);
  assert.match(result.stdout, /offdex start/);
  assert.match(result.stdout, /https:\/\/offdexapp\.vercel\.app/);
  assert.doesNotMatch(result.stderr, /setting up native runtime/);
});

test("npm wrapper status does not download runtime before Offdex is running", () => {
  const packageRoot = mkdtempSync(join(tmpdir(), "offdex-installed-package-"));
  const installRoot = mkdtempSync(join(tmpdir(), "offdex-empty-runtime-"));
  cpSync(join(repoRoot, "packages", "npm", "bin"), join(packageRoot, "bin"), {
    recursive: true,
  });
  writeFileSync(
    join(packageRoot, "package.json"),
    JSON.stringify({ name: "@dhruv2mars/offdex", version: "0.0.7", type: "module" })
  );

  const result = spawnSync(
    process.execPath,
    [join(packageRoot, "bin", "offdex.js"), "status"],
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

  assert.equal(result.status, 1);
  assert.match(result.stdout, /OFFDEX IS NOT RUNNING/);
  assert.match(result.stdout, /offdex start/);
  assert.doesNotMatch(result.stderr, /setting up native runtime/);
  assert.doesNotMatch(result.stderr, /download/);
});

test("npm wrapper stop does not download runtime before Offdex is running", () => {
  const packageRoot = mkdtempSync(join(tmpdir(), "offdex-installed-package-"));
  const installRoot = mkdtempSync(join(tmpdir(), "offdex-empty-runtime-"));
  cpSync(join(repoRoot, "packages", "npm", "bin"), join(packageRoot, "bin"), {
    recursive: true,
  });
  writeFileSync(
    join(packageRoot, "package.json"),
    JSON.stringify({ name: "@dhruv2mars/offdex", version: "0.0.7", type: "module" })
  );

  const result = spawnSync(
    process.execPath,
    [join(packageRoot, "bin", "offdex.js"), "stop"],
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

  assert.equal(result.status, 0);
  assert.match(result.stdout, /OFFDEX IS NOT RUNNING/);
  assert.doesNotMatch(result.stderr, /setting up native runtime/);
  assert.doesNotMatch(result.stderr, /download/);
});
