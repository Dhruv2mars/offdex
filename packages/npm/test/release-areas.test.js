import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveReleaseAreas,
  toGitHubOutput,
} from "../../../scripts/release-areas.mjs";

test("release area detection keeps cli-only changes away from mobile and web", () => {
  assert.deepEqual(
    resolveReleaseAreas([
      "packages/bridge/src/cli.ts",
      "packages/npm/bin/offdex.js",
    ]),
    { cli: true, mobile: false, web: false }
  );
});

test("release area detection keeps mobile-only changes away from cli and web", () => {
  assert.deepEqual(
    resolveReleaseAreas([
      "apps/mobile/app/(tabs)/index.tsx",
    ]),
    { cli: false, mobile: true, web: false }
  );
});

test("release area detection keeps web-only changes away from cli and mobile", () => {
  assert.deepEqual(
    resolveReleaseAreas([
      "apps/web/app/page.tsx",
    ]),
    { cli: false, mobile: false, web: true }
  );
});

test("release area detection fans protocol changes out to runtime clients", () => {
  assert.deepEqual(
    resolveReleaseAreas([
      "packages/protocol/src/index.ts",
    ]),
    { cli: true, mobile: true, web: false }
  );
});

test("release area detection ignores version-only release metadata", () => {
  assert.deepEqual(
    resolveReleaseAreas(
      [
        "apps/mobile/app.json",
        "apps/mobile/package.json",
        "bun.lock",
        "packages/npm/package.json",
      ],
      {
        versionOnlyFiles: new Set([
          "apps/mobile/app.json",
          "apps/mobile/package.json",
          "bun.lock",
          "packages/npm/package.json",
        ]),
      }
    ),
    { cli: false, mobile: false, web: false }
  );
});

test("release area detection writes github outputs", () => {
  assert.equal(
    toGitHubOutput({ cli: true, mobile: false, web: true }),
    "cli=true\nmobile=false\nweb=true"
  );
});
