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
      readAppFile("(marketing)/page.tsx"),
      readAppFile("(app)/webui/page.tsx"),
      readAppFile("(app)/webui/web-app-client.tsx"),
    ].join("\n");

    expect(files).not.toContain("#070807");
    expect(files).not.toContain("#09090b");
    expect(files).not.toContain("#10a37f");
    expect(files).not.toContain("text-brand");
    expect(files).not.toContain("bg-graphite");
  });

  test("applies the card shadow-border system across public web surfaces", () => {
    expect(readAppFile("(marketing)/page.tsx")).toContain("shadow-card");
    expect(readAppFile("(app)/webui/web-app-client.tsx")).toContain("shadow-card");
  });

  test("keeps the current landing page structure without restoring the removed architecture route", () => {
    const home = readAppFile("(marketing)/page.tsx");
    const webui = readAppFile("(app)/webui/web-app-client.tsx");

    expect(home).toContain("The Codex");
    expect(home).toContain("Install Offdex CLI");
    expect(home).toContain("Put authority in the bridge.");
    expect(home).not.toContain("href=\"#architecture\"");
    expect(webui).toContain("Connect to your bridge");
    expect(webui).toContain("Start a new Codex thread");
  });

  test("uses a codex-style web workbench shell", () => {
    const page = readAppFile("(app)/webui/page.tsx");
    const webui = readAppFile("(app)/webui/web-app-client.tsx");

    expect(page).not.toContain("sticky top-0");
    expect(webui).toContain("aria-label=\"Toggle sidebar\"");
    expect(webui).toContain("Offdex");
    expect(webui).toContain("New chat");
    expect(webui).toContain("History");
    expect(webui).toContain("Projects");
    expect(webui).toContain("Permissions");
    expect(webui).toContain("Compact");
    expect(webui).toContain("Usage");
    expect(webui).toContain("Ask Codex anything, @ to add files, / for commands, $ for skills");
    expect(webui).toContain("Command, file, connector, and broader permission requests from Codex will appear here.");
    expect(webui).toContain("Settings");
    expect(webui).not.toContain("Start voice input");
    expect(webui).not.toContain("Sign in on Mac");
    expect(webui).not.toContain("Session cockpit");
    expect(webui).not.toContain("Turn stack");
    expect(webui).not.toContain("Machine trust");
  });
});
