import { describe, expect, test } from "bun:test";
import type { OffdexWorkbenchInventory } from "../app/(app)/webui/web-transport";
import {
  createConnectorResourceAttachment,
  getComposerSkillMentionQuery,
  getComposerSkillSuggestions,
  removeTrailingSkillMentionToken,
} from "../app/(app)/webui/web-app-client";

const skills = [
  {
    id: "system:tdd",
    name: "tdd",
    path: "/Users/dhruv2mars/.agents/skills/tdd/SKILL.md",
    source: "agents",
    enabled: true,
    scope: "system",
    description: "Test-driven development loop.",
    shortDescription: "Red-green-refactor.",
  },
  {
    id: "system:diagnose",
    name: "diagnose",
    path: "/Users/dhruv2mars/.agents/skills/diagnose/SKILL.md",
    source: "agents",
    enabled: true,
    scope: "system",
    description: "Debug failures.",
    shortDescription: null,
  },
  {
    id: "system:disabled",
    name: "disabled",
    path: "/Users/dhruv2mars/.agents/skills/disabled/SKILL.md",
    source: "agents",
    enabled: false,
    scope: "system",
    description: "Hidden from composer suggestions.",
    shortDescription: null,
  },
] satisfies OffdexWorkbenchInventory["skills"];

describe("webui composer skill mentions", () => {
  test("detects a trailing skill token as the active composer command", () => {
    expect(getComposerSkillMentionQuery("$")).toBe("");
    expect(getComposerSkillMentionQuery("Use $td")).toBe("td");
    expect(getComposerSkillMentionQuery("Use $tdd for this")).toBeNull();
    expect(getComposerSkillMentionQuery("No command here")).toBeNull();
  });

  test("filters enabled skill suggestions by active token query", () => {
    expect(getComposerSkillSuggestions(skills, "td")).toEqual([
      {
        id: "system:tdd",
        name: "tdd",
        path: "/Users/dhruv2mars/.agents/skills/tdd/SKILL.md",
        scope: "system",
        description: "Red-green-refactor.",
      },
    ]);
    expect(getComposerSkillSuggestions(skills, "")).toHaveLength(2);
    expect(getComposerSkillSuggestions(skills, "disabled")).toEqual([]);
  });

  test("removes the active token after attaching a structured skill chip", () => {
    expect(removeTrailingSkillMentionToken("Use $td")).toBe("Use");
    expect(removeTrailingSkillMentionToken("$tdd")).toBe("");
  });
});

describe("webui connector resource attachments", () => {
  test("creates browser-safe text context from an attachable connector resource", () => {
    expect(
      createConnectorResourceAttachment({
        serverName: "github",
        uri: "mcp://github/repositories/offdex/issues/79",
        name: "Issue 79",
        title: null,
        mimeType: "text/markdown",
        description: "Connector resource explorer.",
        canAttachAsContext: true,
        attachText: "MCP resource github/Issue 79: mcp://github/repositories/offdex/issues/79",
      })
    ).toEqual({
      id: "mcp-resource:github:mcp://github/repositories/offdex/issues/79",
      name: "Issue 79",
      kind: "connector",
      preview: "github · mcp://github/repositories/offdex/issues/79",
      input: {
        type: "text",
        text: "MCP resource github/Issue 79: mcp://github/repositories/offdex/issues/79",
      },
    });
  });

  test("rejects unavailable or unsafe connector resources", () => {
    expect(
      createConnectorResourceAttachment({
        serverName: "github",
        uri: "javascript:alert(1)",
        name: "Unsafe",
        title: null,
        mimeType: null,
        description: null,
        canAttachAsContext: false,
        attachText: null,
      })
    ).toBeNull();
  });
});
