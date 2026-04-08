import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const appRoot = join(import.meta.dir, "..", "app");

function readAppFile(path: string) {
  return readFileSync(join(appRoot, path), "utf8");
}

describe("web DESIGN.md system", () => {
  test("uses Geist and the light Vercel-style color tokens", () => {
    const layout = readAppFile("layout.tsx");
    const globals = readAppFile("globals.css");

    expect(layout).toContain("Geist");
    expect(layout).toContain("Geist_Mono");
    expect(globals).toContain("--background: #ffffff");
    expect(globals).toContain("--foreground: #171717");
    expect(globals).toContain("--shadow-border");
    expect(globals).toContain("rgba(0, 0, 0, 0.08) 0px 0px 0px 1px");
  });

  test("does not keep the previous dark green theme", () => {
    const files = [
      readAppFile("globals.css"),
      readAppFile("page.tsx"),
      readAppFile("architecture/page.tsx"),
      readAppFile("webui/page.tsx"),
      readAppFile("webui/web-app-client.tsx"),
    ].join("\n");

    expect(files).not.toContain("#070807");
    expect(files).not.toContain("#09090b");
    expect(files).not.toContain("#10a37f");
    expect(files).not.toContain("text-brand");
    expect(files).not.toContain("bg-graphite");
  });

  test("applies the card shadow-border system across public web surfaces", () => {
    expect(readAppFile("page.tsx")).toContain("shadow-card");
    expect(readAppFile("architecture/page.tsx")).toContain("shadow-card");
    expect(readAppFile("webui/web-app-client.tsx")).toContain("shadow-card");
  });
});
