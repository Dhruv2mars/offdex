import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const appRoot = join(import.meta.dir, "..", "app");

describe("web routes", () => {
  test("exposes WebUI only at the canonical /webui route", () => {
    expect(existsSync(join(appRoot, "(app)", "webui", "page.tsx"))).toBe(true);
    expect(existsSync(join(appRoot, "app", "page.tsx"))).toBe(false);
  });
});
