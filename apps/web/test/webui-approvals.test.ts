import { describe, expect, test } from "bun:test";
import {
  getApprovalAnswerFields,
  getApprovalPresentation,
  updateApprovalAnswerJson,
} from "../app/(app)/webui/web-app-client";

describe("webui approval presentation", () => {
  test("uses stronger confirmation copy for risky command and file approvals", () => {
    expect(
      getApprovalPresentation({
        method: "item/commandExecution/requestApproval",
        title: "Command permission",
      })
    ).toMatchObject({
      label: "Command permission",
      approveLabel: "Run command",
      requiresConfirm: true,
      tone: "danger",
    });

    expect(
      getApprovalPresentation({
        method: "applyPatchApproval",
        title: "File permission",
      })
    ).toMatchObject({
      label: "File change permission",
      approveLabel: "Apply patch",
      requiresConfirm: true,
      tone: "danger",
    });
  });

  test("turns structured user input questions into separate answer fields", () => {
    const fields = getApprovalAnswerFields({
      inputSchema: "answers",
      method: "item/tool/requestUserInput",
      rawParams: JSON.stringify({
        questions: [
          { id: "branch_name", question: "Branch name?" },
          { id: "strategy", header: "Strategy" },
        ],
      }),
    });

    expect(fields).toEqual([
      { id: "branch_name", label: "Branch name?", placeholder: "Answer" },
      { id: "strategy", label: "Strategy", placeholder: "Answer" },
    ]);
  });

  test("turns MCP elicitation JSON schema properties into connector fields", () => {
    const fields = getApprovalAnswerFields({
      inputSchema: "answers",
      method: "mcpServer/elicitation/request",
      rawParams: JSON.stringify({
        requestedSchema: {
          properties: {
            repository: { title: "Repository", description: "owner/name" },
          },
        },
      }),
    });

    expect(fields).toEqual([
      { id: "repository", label: "Repository", placeholder: "owner/name" },
    ]);
  });

  test("updates individual answer fields without dropping existing answers", () => {
    expect(updateApprovalAnswerJson('{"branch":"main"}', "strategy", "merge")).toBe(
      '{"branch":"main","strategy":"merge"}'
    );
  });
});
