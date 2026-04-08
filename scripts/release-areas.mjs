import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const VERSION_ONLY_FILES = new Set([
  "apps/mobile/app.json",
  "apps/mobile/package.json",
  "bun.lock",
  "packages/npm/package.json",
]);

export function resolveReleaseAreas(files, options = {}) {
  const versionOnlyFiles = options.versionOnlyFiles ?? new Set();
  const areas = {
    cli: false,
    mobile: false,
    web: false,
  };

  for (const file of files) {
    if (!file || versionOnlyFiles.has(file)) continue;

    if (file.startsWith("apps/web/")) {
      areas.web = true;
      continue;
    }

    if (file.startsWith("apps/mobile/")) {
      areas.mobile = true;
      continue;
    }

    if (file.startsWith("packages/protocol/")) {
      areas.cli = true;
      areas.mobile = true;
      continue;
    }

    if (
      file.startsWith("packages/bridge/") ||
      file.startsWith("packages/npm/") ||
      file.startsWith("packages/control-plane/") ||
      file.startsWith("packages/control-plane-worker/") ||
      file.startsWith("packages/relay/") ||
      file === ".github/workflows/release.yml" ||
      file.startsWith("scripts/")
    ) {
      areas.cli = true;
      continue;
    }

    if (
      file === "package.json" ||
      file === "bun.lock" ||
      file === "turbo.json" ||
      file.startsWith(".github/workflows/")
    ) {
      areas.cli = true;
      areas.mobile = true;
      areas.web = true;
    }
  }

  return areas;
}

export function toGitHubOutput(areas) {
  return [
    `cli=${String(areas.cli)}`,
    `mobile=${String(areas.mobile)}`,
    `web=${String(areas.web)}`,
  ].join("\n");
}

export function previousTagFor(releaseTag) {
  const tags = execFileSync("git", ["tag", "--sort=-v:refname", "--merged", releaseTag], {
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag));
  return tags.find((tag) => tag !== releaseTag) ?? null;
}

export function changedFilesBetween(baseRef, headRef) {
  if (!baseRef) {
    return execFileSync("git", ["ls-tree", "-r", "--name-only", headRef], { encoding: "utf8" })
      .split(/\r?\n/)
      .map((file) => file.trim())
      .filter(Boolean);
  }

  return execFileSync("git", ["diff", "--name-only", `${baseRef}..${headRef}`], { encoding: "utf8" })
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean);
}

export function versionOnlyFilesBetween(baseRef, headRef, files) {
  if (!baseRef) return new Set();

  const versionOnlyFiles = new Set();
  for (const file of files) {
    if (!VERSION_ONLY_FILES.has(file)) continue;
    const patch = execFileSync("git", ["diff", "--unified=0", `${baseRef}..${headRef}`, "--", file], {
      encoding: "utf8",
    });
    const changedLines = patch
      .split(/\r?\n/)
      .filter((line) => /^[+-]/.test(line) && !line.startsWith("+++") && !line.startsWith("---"));
    const onlyVersionChanges = changedLines.length > 0 && changedLines.every((line) => {
      if (file === "bun.lock") {
        return /^\s*[+-]\s+"version":\s+"[^"]+",?\s*$/.test(line);
      }
      return /^\s*[+-]\s+"(?:version|versionCode)":\s+(?:"[^"]+"|\d+),?\s*$/.test(line);
    });
    if (onlyVersionChanges) {
      versionOnlyFiles.add(file);
    }
  }
  return versionOnlyFiles;
}

async function main() {
  const releaseTag = process.argv[2];
  if (!releaseTag) {
    throw new Error("usage: node scripts/release-areas.mjs <release-tag>");
  }

  const previousTag = previousTagFor(releaseTag);
  const files = changedFilesBetween(previousTag, releaseTag);
  const versionOnlyFiles = versionOnlyFilesBetween(previousTag, releaseTag, files);
  const areas = resolveReleaseAreas(files, { versionOnlyFiles });
  process.stdout.write(`${toGitHubOutput(areas)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
