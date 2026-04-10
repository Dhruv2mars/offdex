import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const appRoot = join(import.meta.dir, "..", "app");

function readAppFile(path: string) {
  return readFileSync(join(appRoot, "(marketing)", path), "utf8");
}

describe("public content pages", () => {
  test("documents the core bridge and pairing flow", () => {
    const docs = readAppFile("docs/page.tsx");

    expect(docs).toContain("Quick Start");
    expect(docs).toContain("Install the Offdex CLI");
    expect(docs).toContain("Start your local bridge");
    expect(docs).toContain("Pair from phone or web");
    expect(docs).toContain("Mac owns the session");
  });

  test("wires the changelog to GitHub releases", () => {
    const changelog = readAppFile("changelog/page.tsx");
    const releases = readAppFile("changelog/releases.ts");

    expect(changelog).toContain("Changelog");
    expect(changelog).toContain("Release feed unavailable");
    expect(changelog).toContain("Go to GitHub");
    expect(releases).toContain("api.github.com/repos/Dhruv2mars/offdex/releases");
    expect(releases).toContain("revalidate");
  });

  test("offers the CLI install path and mobile download section", () => {
    const download = readAppFile("download/page.tsx");

    expect(download).toContain("Offdex CLI");
    expect(download).toContain("Mobile Apps");
    expect(download).toContain("Android APK");
    expect(download).toContain("iOS Source");
    expect(download).toContain("PackageManagerTerminal");
  });
});