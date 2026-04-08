import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const repoRoot = join(import.meta.dirname, "..", "..", "..");

test("repo keeps the root design system instructions wired into agent guidance", () => {
  const designPath = join(repoRoot, "DESIGN.md");
  assert.equal(existsSync(designPath), true);

  const design = readFileSync(designPath, "utf8");
  assert.match(design, /Design System Inspiration of Vercel/);
  assert.match(design, /shadow-as-border/i);

  const agentInstructions = readFileSync(join(repoRoot, "AGENTS.md"), "utf8");
  assert.match(agentInstructions, /DESIGN\.md/);
  assert.match(agentInstructions, /strict/i);
});
