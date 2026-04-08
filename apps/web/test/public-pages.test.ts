import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const appRoot = join(import.meta.dir, "..", "app");

function readAppFile(path: string) {
  return readFileSync(join(appRoot, path), "utf8");
}

describe("public content pages", () => {
  test("documents the core bridge and pairing flow", () => {
    const docs = readAppFile("docs/page.tsx");

    expect(docs).toContain("Get started fast");
    expect(docs).toContain("Install the bridge");
    expect(docs).toContain("Start your local bridge");
    expect(docs).toContain("Pair from phone or web");
    expect(docs).toContain("Mac owns the session");
  });

  test("wires the changelog to GitHub releases", () => {
    const changelog = readAppFile("changelog/page.tsx");
    const releases = readAppFile("changelog/releases.ts");

    expect(changelog).toContain("Latest releases");
    expect(changelog).toContain("Release feed unavailable");
    expect(changelog).toContain("View all releases");
    expect(releases).toContain("api.github.com/repos/Dhruv2mars/offdex/releases");
    expect(releases).toContain("revalidate: 3600");
  });

  test("offers the CLI install path and mobile download section", () => {
    const download = readAppFile("download/page.tsx");

    expect(download).toContain("Bridge CLI");
    expect(download).toContain("Mobile apps");
    expect(download).toContain("Android APK");
    expect(download).toContain("Private beta");
    expect(download).toContain("cliInstallCommand");
  });
});
