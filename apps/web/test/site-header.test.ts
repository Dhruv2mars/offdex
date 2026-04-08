import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const componentRoot = join(import.meta.dir, "..", "components");

function readComponentFile(path: string) {
  return readFileSync(join(componentRoot, path), "utf8");
}

describe("site header sizing", () => {
  test("sizes the wordmark and GitHub icon to visually balance the mascot", () => {
    const header = readComponentFile("site-header.tsx");

    expect(header).toContain("text-[20px] leading-[20px]");
    expect(header).toContain("h-6 w-6");
  });
});
