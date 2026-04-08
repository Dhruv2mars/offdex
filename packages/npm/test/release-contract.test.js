import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dirname, "..", "..", "..");
const packageJson = JSON.parse(
  readFileSync(join(repoRoot, "packages", "npm", "package.json"), "utf8")
);
const releaseWorkflow = readFileSync(
  join(repoRoot, ".github", "workflows", "release.yml"),
  "utf8"
);

test("npm package keeps the publish contract", () => {
  assert.equal(packageJson.name, "@dhruv2mars/offdex");
  assert.equal(packageJson.publishConfig.access, "public");
  assert.equal(packageJson.preferGlobal, true);
});

test("release workflow publishes npm and platform binaries", () => {
  assert.match(releaseWorkflow, /gh release upload --clobber/);
  assert.match(releaseWorkflow, /offdex-\$\{\{ matrix\.platform \}\}-\$\{\{ matrix\.arch \}\}/);
  assert.match(releaseWorkflow, /\.gz"/);
  assert.match(releaseWorkflow, /npm publish --(?:provenance --)?access public/);
  assert.match(releaseWorkflow, /bun-linux-x64-baseline/);
  assert.match(releaseWorkflow, /bun-linux-arm64/);
  assert.match(releaseWorkflow, /bun-windows-x64-baseline/);
  assert.match(releaseWorkflow, /bun-darwin-arm64/);
  assert.match(releaseWorkflow, /bun-darwin-x64/);
  assert.doesNotMatch(releaseWorkflow, /bun-windows-arm64/);
});

test("release workflow detects web, mobile, and cli areas before publishing", () => {
  assert.match(releaseWorkflow, /detect_areas:/);
  assert.match(releaseWorkflow, /node scripts\/release-areas\.mjs/);
  assert.match(releaseWorkflow, /validate_cli:/);
  assert.match(releaseWorkflow, /validate_mobile:/);
  assert.match(releaseWorkflow, /validate_web:/);
  assert.match(releaseWorkflow, /needs\.detect_areas\.outputs\.cli == 'true'/);
  assert.match(releaseWorkflow, /needs\.detect_areas\.outputs\.mobile == 'true'/);
  assert.match(releaseWorkflow, /needs\.detect_areas\.outputs\.web == 'true'/);
});

test("release workflow keeps Android builds opt-in for fast CLI releases", () => {
  assert.match(releaseWorkflow, /publish_android:/);
  assert.match(releaseWorkflow, /default:\s*false/);
  assert.match(releaseWorkflow, /release_tag="\$\{GITHUB_REF_NAME\}"\n\s+publish_android="false"/);
  assert.match(
    releaseWorkflow,
    /build_android_release:\n(?:.*\n)*?\s+if:\s+\$\{\{\s*needs\.resolve_tag\.outputs\.publish_android == 'true'\s*\}\}/
  );
});
