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
    expect(readAppFile("webui/web-app-client.tsx")).toContain("shadow-card");
  });

  test("keeps the current landing page structure without restoring the removed architecture route", () => {
    const home = readAppFile("page.tsx");
    const webui = readAppFile("webui/web-app-client.tsx");

    expect(home).toContain("The Codex");
    expect(home).toContain("Install Bridge");
    expect(home).toContain("Put authority in the bridge.");
    expect(home).not.toContain("href=\"#architecture\"");
    expect(webui).toContain("What do you want Codex to do?");
  });

  test("uses a ChatGPT-style web UI sidebar shell", () => {
    const page = readAppFile("webui/page.tsx");
    const webui = readAppFile("webui/web-app-client.tsx");

    expect(page).not.toContain("sticky top-0");
    expect(webui).toContain("data-webui-sidebar");
    expect(webui).toContain("aria-label=\"Toggle sidebar\"");
    expect(webui).toContain("Offdex");
    expect(webui).toContain("New chat");
    expect(webui).toContain("Projects");
    expect(webui).toContain("Threads");
    expect(webui).toContain("data-webui-project-row");
    expect(webui).toContain("data-webui-project-threads");
    expect(webui).toContain("Settings");
    expect(webui).not.toContain("Sign in on Mac");
    expect(webui).not.toContain("Session cockpit");
    expect(webui).not.toContain("Turn stack");
    expect(webui).not.toContain("Machine trust");
  });
});
