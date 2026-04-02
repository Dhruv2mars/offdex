import { describe, expect, test } from "bun:test";
import {
  NEW_THREAD_ID,
  applyCodexNotification,
  buildCodexExecutableCandidates,
  createCodexSnapshot,
  findActiveTurnId,
  mapCodexThreadToOffdexThread,
  parseCodexAccountSummary,
  resolveCodexExecutable,
} from "../src";

describe("codex snapshot adapter", () => {
  test("prefers the bun codex path ahead of an older PATH match", () => {
    const candidates = buildCodexExecutableCandidates(
      {
        HOME: "/Users/dhruv2mars",
      },
      () => "/Users/dhruv2mars/.nvm/versions/node/v24.12.0/bin/codex",
      () => true
    );

    expect(candidates).toEqual([
      "/Users/dhruv2mars/.bun/bin/codex",
      "/Users/dhruv2mars/.nvm/versions/node/v24.12.0/bin/codex",
    ]);
  });

  test("chooses the first codex binary that supports app-server listen mode", async () => {
    const executable = await resolveCodexExecutable(
      {
        HOME: "/Users/dhruv2mars",
      },
      () => "/Users/dhruv2mars/.nvm/versions/node/v24.12.0/bin/codex",
      () => true,
      async (candidate) => candidate === "/Users/dhruv2mars/.bun/bin/codex"
    );

    expect(executable).toBe("/Users/dhruv2mars/.bun/bin/codex");
  });

  test("fails clearly when no supported codex cli exists", async () => {
    await expect(
      resolveCodexExecutable(
        {
          HOME: "/Users/dhruv2mars",
        },
        () => null,
        () => false
      )
    ).rejects.toThrow("No supported Codex CLI found.");
  });

  test("maps a codex thread with turns into offdex messages", () => {
    const thread = {
      id: "thread-1",
      preview: "Fix Offdex bridge",
      ephemeral: false,
      modelProvider: "openai",
      createdAt: 1774702996,
      updatedAt: 1774703010,
      status: { type: "idle" },
      path: null,
      cwd: "/Users/dhruv2mars/dev/github/offdex",
      cliVersion: "0.116.0",
      source: "appServer",
      agentNickname: null,
      agentRole: null,
      gitInfo: null,
      name: "Fix Offdex bridge",
      turns: [
        {
          id: "turn-1",
          status: "completed",
          error: null,
          items: [
            {
              type: "userMessage",
              id: "item-user",
              content: [{ type: "text", text: "Ship it.", text_elements: [] }],
            },
            {
              type: "reasoning",
              id: "item-reasoning",
              summary: [],
              content: [],
            },
            {
              type: "agentMessage",
              id: "item-agent",
              text: "Done.",
              phase: "final_answer",
              memoryCitation: null,
            },
          ],
        },
      ],
    } as const;

    const mapped = mapCodexThreadToOffdexThread(thread, "cli");

    expect(mapped.title).toBe("Fix Offdex bridge");
    expect(mapped.projectLabel).toBe("offdex");
    expect(mapped.state).toBe("completed");
    expect(mapped.messages.map((message) => message.body)).toEqual(["Ship it.", "Done."]);
  });

  test("creates a placeholder thread when codex has no history for this workspace", () => {
    const snapshot = createCodexSnapshot("cli", []);

    expect(snapshot.threads).toHaveLength(1);
    expect(snapshot.threads[0]?.id).toBe(NEW_THREAD_ID);
    expect(snapshot.threads[0]?.title).toContain("New");
  });

  test("finds the latest active turn in a thread", () => {
    const thread = {
      id: "thread-run",
      preview: "Live thread",
      ephemeral: false,
      modelProvider: "openai",
      createdAt: 1774702996,
      updatedAt: 1774703010,
      status: { type: "active" },
      path: null,
      cwd: "/Users/dhruv2mars/dev/github/offdex",
      cliVersion: "0.116.0",
      source: "appServer",
      agentNickname: null,
      agentRole: null,
      gitInfo: null,
      name: "Live thread",
      turns: [
        { id: "turn-done", items: [], status: "completed", error: null },
        { id: "turn-active", items: [], status: "inProgress", error: null },
      ],
    } as const;

    expect(findActiveTurnId(thread)).toBe("turn-active");
  });

  test("merges live agent deltas into one assistant row", () => {
    const seed = createCodexSnapshot("cli", []);
    const thread = {
      id: "thread-live",
      preview: "Live thread",
      ephemeral: false,
      modelProvider: "openai",
      createdAt: 1774702996,
      updatedAt: 1774703010,
      status: { type: "idle" },
      path: null,
      cwd: "/Users/dhruv2mars/dev/github/offdex",
      cliVersion: "0.116.0",
      source: "appServer",
      agentNickname: null,
      agentRole: null,
      gitInfo: null,
      name: "Live thread",
      turns: [],
    } as const;

    const withThread = applyCodexNotification(
      seed,
      { method: "thread/started", params: { thread } },
      "cli"
    );
    const withTurn = applyCodexNotification(
      withThread,
      {
        method: "turn/started",
        params: {
          threadId: "thread-live",
          turn: { id: "turn-live", items: [], status: "inProgress", error: null },
        },
      },
      "cli"
    );
    const withAgentStart = applyCodexNotification(
      withTurn,
      {
        method: "item/started",
        params: {
          threadId: "thread-live",
          turnId: "turn-live",
          item: {
            type: "agentMessage",
            id: "agent-live",
            text: "",
            phase: "final_answer",
            memoryCitation: null,
          },
        },
      },
      "cli"
    );
    const withDeltaA = applyCodexNotification(
      withAgentStart,
      {
        method: "item/agentMessage/delta",
        params: {
          threadId: "thread-live",
          turnId: "turn-live",
          itemId: "agent-live",
          delta: "O",
        },
      },
      "cli"
    );
    const withDeltaB = applyCodexNotification(
      withDeltaA,
      {
        method: "item/agentMessage/delta",
        params: {
          threadId: "thread-live",
          turnId: "turn-live",
          itemId: "agent-live",
          delta: "K",
        },
      },
      "cli"
    );
    const completed = applyCodexNotification(
      withDeltaB,
      {
        method: "item/completed",
        params: {
          threadId: "thread-live",
          turnId: "turn-live",
          item: {
            type: "agentMessage",
            id: "agent-live",
            text: "OK",
            phase: "final_answer",
            memoryCitation: null,
          },
        },
      },
      "cli"
    );

    const liveThread = completed.threads.find((entry) => entry.id === "thread-live");

    expect(liveThread?.state).toBe("running");
    expect(liveThread?.messages).toHaveLength(1);
    expect(liveThread?.messages[0]?.body).toBe("OK");
  });

  test("parses the codex account summary from account/read payloads", () => {
    expect(
      parseCodexAccountSummary({
        account: {
          userId: "user-123",
          email: "dhruv@example.com",
          name: "Dhruv",
          planType: "plus",
        },
      })
    ).toEqual({
      id: "user-123",
      email: "dhruv@example.com",
      name: "Dhruv",
      planType: "plus",
      isAuthenticated: true,
    });
  });
});
