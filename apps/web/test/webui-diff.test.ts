import { describe, expect, test } from "bun:test";
import { parseUnifiedDiff } from "../app/(app)/webui/web-app-client";

describe("webui diff parsing", () => {
  test("splits a unified diff into file-aware review cards", () => {
    const diff = [
      "diff --git a/apps/web/app.tsx b/apps/web/app.tsx",
      "--- a/apps/web/app.tsx",
      "+++ b/apps/web/app.tsx",
      "@@ -1,3 +1,4 @@",
      " import React from 'react';",
      "+import type { ReactNode } from 'react';",
      " export default function App() {",
      "-  return <main>Hello</main>;",
      "+  return <main>Hello, Offdex</main>;",
      " }",
      "diff --git a/old-name.ts b/new-name.ts",
      "rename from old-name.ts",
      "rename to new-name.ts",
      "@@ -1 +1 @@",
      "-export const oldName = true;",
      "+export const newName = true;",
    ].join("\n");

    const files = parseUnifiedDiff(diff);

    expect(files).toHaveLength(2);
    expect(files[0]).toMatchObject({
      path: "apps/web/app.tsx",
      previousPath: null,
      additions: 2,
      deletions: 1,
    });
    expect(files[1]).toMatchObject({
      path: "new-name.ts",
      previousPath: "old-name.ts",
      additions: 1,
      deletions: 1,
    });
    expect(files[1]?.raw).toContain("rename from old-name.ts");
  });

  test("returns an empty review set when the diff has no file headers", () => {
    expect(parseUnifiedDiff("@@ -1 +1 @@\n-old\n+new")).toEqual([]);
  });
});
