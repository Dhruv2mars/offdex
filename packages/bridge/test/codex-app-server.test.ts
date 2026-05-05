import { describe, expect, test } from "bun:test";
import { WorkspaceSnapshotStore, makeDemoWorkspaceSnapshot } from "@offdex/protocol";
import {
  CodexAppServerClient,
  CodexBridgeRuntime,
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
    expect(mapped.summary).toMatchObject({
      messageCount: 2,
      commandCount: 0,
      toolActivityCount: 0,
      reasoningCount: 1,
      diffTurnCount: 0,
      latestAssistantText: "Done.",
      pendingApprovalCount: 0,
      activePermissionReviewCount: 0,
      failedTurnCount: 0,
    });
  });

  test("maps task, tool, file, and usage runtime items into typed timeline rows", () => {
    const thread = {
      id: "thread-runtime",
      preview: "Runtime thread",
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
      name: "Runtime thread",
      turns: [
        {
          id: "turn-runtime",
          status: "completed",
          error: null,
          items: [
            {
              type: "task_started",
              id: "task-1",
              turn_id: "turn-runtime",
            },
            {
              type: "function_call",
              id: "tool-1",
              name: "write_stdin",
              arguments: "{\"chars\":\"y\"}",
              summary: "Waiting for approval input",
            },
            {
              type: "mcp_tool_call_output",
              id: "tool-2",
              call_id: "call-github-1",
              server: "github",
              name: "list_issues",
              output: [{ number: 76, title: "Timeline fidelity" }],
              api_token: "secret-token",
            },
            {
              type: "operation_progress",
              id: "progress-1",
              label: "Applying patch",
              completed: 1,
              total: 2,
            },
            {
              type: "tool_error",
              id: "error-1",
              title: "Connector failed",
              error: "Forbidden",
            },
            {
              type: "read",
              id: "file-1",
              path: "/Users/dhruv2mars/dev/github/offdex/README.md",
              output: "# Offdex",
            },
            {
              type: "token_count",
              id: "usage-1",
              rate_limits: {
                plan_type: "plus",
                primary: { used_percent: 12 },
                secondary: { used_percent: 48 },
              },
              info: {
                total_token_usage: {
                  total_tokens: 2048,
                },
              },
            },
            {
              type: "task_complete",
              id: "task-2",
              last_agent_message: "Done",
            },
          ],
        },
      ],
    } as const;

    const mapped = mapCodexThreadToOffdexThread(thread, "cli");
    const items = mapped.turns[0]?.items ?? [];

    expect(items[0]).toMatchObject({
      type: "taskLifecycle",
      label: "Task started",
      status: "in_progress",
    });
    expect(items[1]).toMatchObject({
      type: "toolActivity",
      toolName: "write_stdin",
      source: "tool",
      input: "{\"chars\":\"y\"}",
    });
    expect(items[2]).toMatchObject({
      type: "toolActivity",
      toolName: "list_issues",
      source: "mcp",
      phase: "result",
      callId: "call-github-1",
      output: "Timeline fidelity",
      rawMetadata: {
        raw: {
          api_token: "[redacted]",
        },
      },
    });
    expect(items[3]).toMatchObject({
      type: "progressUpdate",
      label: "Applying patch",
      completed: 1,
      total: 2,
    });
    expect(items[4]).toMatchObject({
      type: "runtimeError",
      title: "Connector failed",
      message: "Forbidden",
    });
    expect(items[5]).toMatchObject({
      type: "toolActivity",
      toolName: "Read file",
      source: "file",
      output: "# Offdex",
    });
    expect(items[6]).toMatchObject({
      type: "tokenUsage",
      planType: "plus",
      primaryPercent: 12,
      secondaryPercent: 48,
      totalTokens: 2048,
    });
    expect(items[7]).toMatchObject({
      type: "taskLifecycle",
      label: "Task complete",
      status: "completed",
      detail: "Done",
    });
  });

  test("creates a placeholder thread when codex has no history for this workspace", () => {
    const snapshot = createCodexSnapshot("cli", []);

    expect(snapshot.threads).toHaveLength(1);
    expect(snapshot.threads[0]?.id).toBe(NEW_THREAD_ID);
    expect(snapshot.threads[0]?.title).toContain("New");
  });

  test("keeps archived codex threads separate from active threads", () => {
    const archivedThread = {
      id: "thread-archived",
      preview: "Archived",
      ephemeral: false,
      modelProvider: "openai",
      createdAt: 1774702996,
      updatedAt: 1774703010,
      status: { type: "notLoaded" },
      path: null,
      cwd: "/Users/dhruv2mars/dev/github/offdex",
      cliVersion: "0.116.0",
      source: "appServer",
      agentNickname: null,
      agentRole: null,
      gitInfo: null,
      name: "Archived thread",
      turns: [],
    } as const;

    const snapshot = createCodexSnapshot("cli", [], [archivedThread]);

    expect(snapshot.archivedThreads[0]?.id).toBe("thread-archived");
    expect(snapshot.threads.some((thread) => thread.id === "thread-archived")).toBe(false);
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

  test("stores live turn diff updates on the matching turn", () => {
    const seed = createCodexSnapshot("cli", []);
    const thread = {
      id: "thread-diff",
      preview: "Diff thread",
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
      name: "Diff thread",
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
          threadId: "thread-diff",
          turn: { id: "turn-diff", items: [], status: "inProgress", error: null },
        },
      },
      "cli"
    );
    const withDiff = applyCodexNotification(
      withTurn,
      {
        method: "turn/diff/updated",
        params: {
          threadId: "thread-diff",
          turnId: "turn-diff",
          diff: "diff --git a/file.ts b/file.ts\n+hello",
        },
      },
      "cli"
    );

    const diffThread = withDiff.threads.find((entry) => entry.id === "thread-diff");
    expect(diffThread?.turns[0]?.diff).toContain("+hello");
    expect(diffThread?.summary.diffTurnCount).toBe(1);
  });

  test("normalizes live tool activity notifications into typed rows", () => {
    const seed = createCodexSnapshot("cli", []);
    const thread = {
      id: "thread-tools",
      preview: "Tool thread",
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
      name: "Tool thread",
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
          threadId: "thread-tools",
          turn: { id: "turn-tools", items: [], status: "inProgress", error: null },
        },
      },
      "cli"
    );
    const withTool = applyCodexNotification(
      withTurn,
      {
        method: "item/started",
        params: {
          threadId: "thread-tools",
          turnId: "turn-tools",
          item: {
            type: "web_search_call",
            id: "search-1",
            query: "offdex webui parity",
            status: "running",
          },
        },
      },
      "cli"
    );

    expect(withTool.threads.find((entry) => entry.id === "thread-tools")?.turns[0]?.items[0]).toMatchObject({
      type: "toolActivity",
      toolName: "Web search",
      source: "search",
      status: "in_progress",
      input: "offdex webui parity",
    });
  });

  test("marks permission requests resolved from runtime notifications", () => {
    const seed = makeDemoWorkspaceSnapshot("cli", {
      state: "paired",
    });
    seed.pendingApprovals = [
      {
        id: "req-1",
        method: "item/permissions/requestApproval",
        title: "Permissions required",
        detail: "Need network access",
        threadId: "thread-1",
        turnId: "turn-1",
        createdAt: "2026-04-11T00:00:00.000Z",
        status: "pending",
        inputSchema: "decision",
        rawParams: "{}",
      },
    ];

    const next = applyCodexNotification(
      seed,
      {
        method: "serverRequest/resolved",
        params: {
          requestId: "req-1",
          result: {
            decision: "denied",
          },
        },
      },
      "cli"
    );

    expect(next.pendingApprovals[0]?.status).toBe("declined");
  });

  test("tracks guardian permission review notifications", () => {
    const seed = createCodexSnapshot("cli", []);

    const reviewing = applyCodexNotification(
      seed,
      {
        method: "item/autoApprovalReview/started",
        params: {
          threadId: "thread-review",
          turnId: "turn-review",
          itemId: "review-1",
          message: "Reviewing whether network access can be auto-approved.",
        },
      },
      "cli"
    );

    expect(reviewing.permissionReviews[0]?.status).toBe("running");
    expect(reviewing.permissionReviews[0]?.detail).toContain("network access");
    expect(reviewing.threads.find((entry) => entry.id === "thread-review")?.summary.activePermissionReviewCount).toBe(1);

    const completed = applyCodexNotification(
      reviewing,
      {
        method: "item/autoApprovalReview/completed",
        params: {
          threadId: "thread-review",
          turnId: "turn-review",
          itemId: "review-1",
          status: "approved",
          message: "Network access was auto-approved.",
        },
      },
      "cli"
    );

    expect(completed.permissionReviews[0]?.status).toBe("completed");
    expect(completed.permissionReviews[0]?.outcome).toBe("approved");
    expect(completed.threads.find((entry) => entry.id === "thread-review")?.summary.activePermissionReviewCount).toBe(0);
    expect(completed.threads.find((entry) => entry.id === "thread-review")?.turns[0]?.items[0]).toMatchObject({
      type: "unknown",
      label: "permission review",
    });
  });

  test("marks failed turns in thread summaries when runtime errors arrive", () => {
    const seed = createCodexSnapshot("cli", []);

    const next = applyCodexNotification(
      seed,
      {
        method: "error",
        params: {
          threadId: "thread-error",
          turnId: "turn-error",
          error: "Command failed",
          willRetry: false,
        },
      },
      "cli"
    );

    const thread = next.threads.find((entry) => entry.id === "thread-error");
    expect(thread?.state).toBe("failed");
    expect(thread?.summary.failedTurnCount).toBe(1);
    expect(thread?.summary.latestAssistantText).toBeNull();
  });

  test("preserves known turn diffs when a fresh snapshot is rebuilt from thread reads", () => {
    const seed = createCodexSnapshot("cli", []);
    const seedWithDiff = applyCodexNotification(
      seed,
      {
        method: "turn/diff/updated",
        params: {
          threadId: "thread-diff-keep",
          turnId: "turn-diff-keep",
          diff: "diff --git a/probe.txt b/probe.txt\n+PROBE",
        },
      },
      "cli"
    );

    const rebuilt = createCodexSnapshot(
      "cli",
      [
        {
          id: "thread-diff-keep",
          preview: "Keep diff",
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
          name: "Keep diff",
          turns: [
            {
              id: "turn-diff-keep",
              status: "completed",
              error: null,
              items: [],
            },
          ],
        },
      ],
      [],
      seedWithDiff
    );

    expect(rebuilt.threads[0]?.turns[0]?.diff).toContain("+PROBE");
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

  test("maps account auth, steer, rewind, and git diff client requests to the current codex protocol", async () => {
    const client = new CodexAppServerClient();
    const calls: Array<{ method: string; params: unknown }> = [];

    client.ensureConnected = async () => {};
    client.request = async (method: string, params: unknown) => {
      calls.push({ method, params });
      if (method === "account/login/start") {
        return {
          type: "chatgpt",
          loginId: "login-123",
          authUrl: "https://chatgpt.com/auth",
        };
      }
      if (method === "gitDiffToRemote") {
        return {
          sha: "abc123def456",
          diff: "diff --git a/app.ts b/app.ts\n+ship",
        };
      }
      return {};
    };

    const session = await client.startAccountLogin();
    await client.steerTurn("thread-1", "turn-1", [{ type: "text", text: "Focus on the error log." }]);
    await client.rollbackThread("thread-1", 2);
    await client.cancelAccountLogin("login-123");
    await client.logoutAccount();
    await client.setExperimentalFeatureEnablement({ remote_exec: true });
    const diff = await client.readGitDiffToRemote("/Users/dhruv2mars/dev/github/offdex");

    expect(session).toEqual({
      type: "chatgpt",
      loginId: "login-123",
      authUrl: "https://chatgpt.com/auth",
    });
    expect(diff.sha).toBe("abc123def456");
    expect(diff.diff).toContain("+ship");
    expect(calls).toEqual([
      {
        method: "account/login/start",
        params: { type: "chatgpt" },
      },
      {
        method: "turn/steer",
        params: {
          threadId: "thread-1",
          expectedTurnId: "turn-1",
          input: [{ type: "text", text: "Focus on the error log." }],
        },
      },
      {
        method: "thread/rollback",
        params: { threadId: "thread-1", numTurns: 2 },
      },
      {
        method: "account/login/cancel",
        params: { loginId: "login-123" },
      },
      {
        method: "account/logout",
        params: undefined,
      },
      {
        method: "experimentalFeature/enablement/set",
        params: { enablement: { remote_exec: true } },
      },
      {
        method: "gitDiffToRemote",
        params: { cwd: "/Users/dhruv2mars/dev/github/offdex" },
      },
    ]);
  });

  test("rejects unusable account login sessions from codex", async () => {
    const client = new CodexAppServerClient();
    client.ensureConnected = async () => {};
    client.request = async () => ({ type: "chatgpt", loginId: "", authUrl: "" });

    await expect(client.startAccountLogin()).rejects.toThrow(
      "Account login start returned an unusable session"
    );
  });

  test("clears the stored account state when runtime logout succeeds", async () => {
    const store = new WorkspaceSnapshotStore(
      makeDemoWorkspaceSnapshot("cli", {
        state: "paired",
      })
    );
    store.updateAccount({
      id: "user-123",
      email: "dhruv@example.com",
      name: "Dhruv",
      planType: "plus",
      isAuthenticated: true,
    });

    const runtime = new CodexBridgeRuntime({
      runtimeTarget: "cli",
      workspaceStore: store,
      cwd: "/Users/dhruv2mars/dev/github/offdex",
    });

    runtime.client.ensureConnected = async () => {};
    runtime.client.subscribe = () => () => {};
    runtime.client.logoutAccount = async () => ({});

    const snapshot = await runtime.logoutAccount();

    expect(snapshot.account).toEqual({
      id: null,
      email: null,
      name: null,
      planType: null,
      isAuthenticated: false,
    });
  });

  test("moves a turn onto a fresh thread when codex rejects a stale thread id", async () => {
    const store = new WorkspaceSnapshotStore(
      makeDemoWorkspaceSnapshot("cli", {
        state: "paired",
      })
    );
    store.replaceSnapshot({
      ...store.getSnapshot(),
      threads: [
        {
          id: "stale-thread",
          title: "Old thread",
          projectLabel: "offdex",
          threadKind: "conversation",
          sourceThreadId: null,
          reviewThreadId: null,
          summary: {
            messageCount: 0,
            commandCount: 0,
            toolActivityCount: 0,
            reasoningCount: 0,
            diffTurnCount: 0,
            latestAssistantText: null,
            pendingApprovalCount: 0,
            activePermissionReviewCount: 0,
            failedTurnCount: 0,
          },
          runtimeTarget: "cli",
          state: "completed",
          unreadCount: 0,
          updatedAt: "2d ago",
          path: null,
          cwd: "/Users/dhruv2mars/dev/github/offdex",
          cliVersion: "0.116.0",
          source: "appServer",
          agentNickname: null,
          agentRole: null,
          gitInfo: null,
          messages: [],
          turns: [],
        },
      ],
    });

    const runtime = new CodexBridgeRuntime({
      runtimeTarget: "cli",
      workspaceStore: store,
      cwd: "/Users/dhruv2mars/dev/github/offdex",
    });
    const calls: string[] = [];

    runtime.client.ensureConnected = async () => {};
    runtime.client.subscribe = () => () => {};
    runtime.client.startThread = async () => {
      calls.push("startThread");
      return {
        id: "fresh-thread",
        preview: "",
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
        name: null,
        turns: [],
      };
    };
    runtime.client.startTurn = async (threadId: string) => {
      calls.push(`startTurn:${threadId}`);
      if (threadId === "stale-thread") {
        throw new Error("thread not found: stale-thread");
      }
      return null;
    };

    const nextSnapshot = await runtime.sendTurn("stale-thread", "Start from a clean live thread.");

    expect(calls).toEqual(["startTurn:stale-thread", "startThread", "startTurn:fresh-thread"]);
    expect(nextSnapshot.threads[0]?.id).toBe("fresh-thread");
    expect(nextSnapshot.threads.some((thread) => thread.id === "stale-thread")).toBe(false);
    expect(nextSnapshot.threads[0]?.title).toBe("Start from a clean live thread.");
    expect(nextSnapshot.threads[0]?.state).toBe("running");
  });

  test("reads runtime inventory with plugin and skill metadata", async () => {
    const store = new WorkspaceSnapshotStore(
      makeDemoWorkspaceSnapshot("cli", {
        state: "paired",
      })
    );
    const runtime = new CodexBridgeRuntime({
      runtimeTarget: "cli",
      workspaceStore: store,
      cwd: "/Users/dhruv2mars/dev/github/offdex",
    });

    runtime.client.ensureConnected = async () => {};
    runtime.client.subscribe = () => () => {};
    runtime.client.subscribeToServerRequests = () => () => {};
    runtime.client.listApps = async () => [];
    runtime.client.listModels = async () => [];
    runtime.client.readConfig = async () => ({
      model: "gpt-5.4",
      model_provider: "openai",
      model_reasoning_effort: "high",
      sandbox_mode: "danger-full-access",
      approval_policy: "never",
      web_search: "live",
    });
    runtime.client.listPlugins = async () => [
      {
        name: "default",
        path: "/Users/dhruv2mars/.codex/plugins",
        plugins: [
          {
            id: "vercel",
            name: "Vercel",
            enabled: true,
            installed: true,
            installPolicy: "INSTALLED_BY_DEFAULT",
            authPolicy: "ON_USE",
            interface: {
              category: "hosting",
              developerName: "Vercel",
              displayName: "Vercel",
              shortDescription: "Deploy and inspect apps",
              websiteUrl: "https://vercel.com",
              capabilities: ["deployments"],
              screenshots: [],
            },
            source: {
              type: "local",
              path: "/Users/dhruv2mars/.codex/plugins/vercel",
            },
          },
        ],
      },
    ];
    runtime.client.listSkills = async () => [
      {
        cwd: "/Users/dhruv2mars/dev/github/offdex",
        errors: [],
        skills: [
          {
            name: "agent-browser",
            description: "Browser automation",
            enabled: true,
            path: "/Users/dhruv2mars/.agents/skills/agent-browser/SKILL.md",
            scope: "user",
            shortDescription: "Automate the browser",
          },
        ],
      },
    ];
    runtime.client.listMcpServers = async () => [
      {
        name: "vercel",
        authStatus: "notLoggedIn",
        tools: {
          deploy: {},
          logs: {},
        },
        resources: [{}],
        resourceTemplates: [{}, {}],
      },
    ];
    runtime.client.readRateLimits = async () => ({
      limitId: "codex",
      limitName: null,
      planType: "plus",
      primary: {
        usedPercent: 62,
        windowDurationMins: 300,
        resetsAt: "2026-04-11T19:30:00.000Z",
      },
      secondary: {
        usedPercent: 18,
        windowDurationMins: 10080,
        resetsAt: "2026-04-18T19:30:00.000Z",
      },
      credits: {
        hasCredits: false,
        unlimited: false,
        balance: "0",
      },
    });
    runtime.client.listExperimentalFeatures = async () => [
      {
        name: "js_repl",
        stage: "beta",
        displayName: "JavaScript REPL",
        description: "Persistent Node-backed REPL",
        announcement: "NEW",
        enabled: false,
        defaultEnabled: false,
      },
    ];

    const inventory = await runtime.readWorkbenchInventory();

    expect(inventory.plugins[0]).toMatchObject({
      id: "vercel",
      name: "Vercel",
      enabled: true,
      installed: true,
      developer: "Vercel",
      category: "hosting",
    });
    expect(inventory.skills[0]).toMatchObject({
      id: "user:agent-browser",
      name: "agent-browser",
      enabled: true,
      scope: "user",
      description: "Browser automation",
    });
    expect(inventory.mcpServers[0]).toEqual({
      name: "vercel",
      authStatus: "notLoggedIn",
      toolCount: 2,
      resourceCount: 1,
      resourceTemplateCount: 2,
    });
    expect(inventory.rateLimits?.primary?.usedPercent).toBe(62);
    expect(inventory.experimentalFeatures?.[0]).toMatchObject({
      name: "js_repl",
      stage: "beta",
      enabled: false,
    });
  });

  test("writes runtime config values and skill toggles through codex", async () => {
    const store = new WorkspaceSnapshotStore(
      makeDemoWorkspaceSnapshot("cli", {
        state: "paired",
      })
    );
    const runtime = new CodexBridgeRuntime({
      runtimeTarget: "cli",
      workspaceStore: store,
      cwd: "/Users/dhruv2mars/dev/github/offdex",
    });
    const calls: string[] = [];
    let currentConfig = {
      model: "gpt-5.4",
      model_provider: "openai",
      model_reasoning_effort: "high",
      sandbox_mode: "danger-full-access",
      approval_policy: "never",
      web_search: "live",
    };
    let currentSkillEnabled = false;

    runtime.client.ensureConnected = async () => {};
    runtime.client.subscribe = () => () => {};
    runtime.client.subscribeToServerRequests = () => () => {};
    runtime.client.writeConfigValue = async (keyPath: string, value: unknown) => {
      calls.push(`config:${keyPath}:${String(value)}`);
      if (keyPath === "model" && typeof value === "string") {
        currentConfig = {
          ...currentConfig,
          model: value,
        };
      }
      return {
        filePath: "/Users/dhruv2mars/.codex/config.toml",
        status: "updated",
        version: "1",
      };
    };
    runtime.client.writeSkillConfig = async (input: { name?: string | null; path?: string | null; enabled: boolean }) => {
      calls.push(`skill:${input.name}:${String(input.enabled)}`);
      currentSkillEnabled = input.enabled;
      return {
        effectiveEnabled: input.enabled,
      };
    };
    runtime.client.listApps = async () => [];
    runtime.client.listModels = async () => [];
    runtime.client.readConfig = async () => currentConfig;
    runtime.client.listPlugins = async () => [];
    runtime.client.listSkills = async () => [
      {
        cwd: "/Users/dhruv2mars/dev/github/offdex",
        errors: [],
        skills: [
          {
            name: "agent-browser",
            description: "Browser automation",
            enabled: currentSkillEnabled,
            path: "/Users/dhruv2mars/.agents/skills/agent-browser/SKILL.md",
            scope: "user",
            shortDescription: "Automate the browser",
          },
        ],
      },
    ];

    const configResult = await runtime.writeConfigValue("model", "gpt-5.4-mini");
    const inventory = await runtime.setSkillEnabled({
      name: "agent-browser",
      enabled: true,
    });

    expect(calls).toEqual([
      "config:model:gpt-5.4-mini",
      "skill:agent-browser:true",
    ]);
    expect(configResult.config?.model).toBe("gpt-5.4-mini");
    expect(inventory.skills[0]?.enabled).toBe(true);
  });

  test("surfaces runtime readiness blockers from config requirements and auth status", async () => {
    const store = new WorkspaceSnapshotStore(
      makeDemoWorkspaceSnapshot("cli", {
        state: "paired",
      })
    );
    const runtime = new CodexBridgeRuntime({
      runtimeTarget: "cli",
      workspaceStore: store,
      cwd: "/Users/dhruv2mars/dev/github/offdex",
    });

    runtime.client.ensureConnected = async () => {};
    runtime.client.subscribe = () => () => {};
    runtime.client.subscribeToServerRequests = () => () => {};
    runtime.client.listApps = async () => [];
    runtime.client.listModels = async () => [];
    runtime.client.readConfig = async () => ({
      model: "gpt-5.4",
      model_provider: "openai",
      model_reasoning_effort: "high",
      sandbox_mode: "danger-full-access",
      approval_policy: "never",
      web_search: "live",
    });
    runtime.client.readConfigRequirements = async () => ({
      allowedApprovalPolicies: ["on-request"],
      allowedSandboxModes: ["workspace-write"],
      allowedWebSearchModes: ["cached"],
      featureRequirements: {
        experimental_guest_auth: false,
      },
      enforceResidency: "us",
    });
    runtime.client.readAuthStatus = async () => ({
      authMethod: null,
      requiresOpenaiAuth: true,
    });
    runtime.client.readAccount = async () => ({
      id: null,
      email: null,
      name: null,
      planType: null,
      isAuthenticated: false,
    });
    runtime.client.listPlugins = async () => [];
    runtime.client.listSkills = async () => [];

    const inventory = await runtime.readWorkbenchInventory();

    expect(inventory.runtimeReadiness?.status).toBe("blocked");
    expect(inventory.runtimeReadiness?.requirements).toMatchObject({
      allowedApprovalPolicies: ["on-request"],
      allowedSandboxModes: ["workspace-write"],
      allowedWebSearchModes: ["cached"],
      enforceResidency: "us",
    });
    expect(inventory.runtimeReadiness?.issues.map((issue) => issue.id)).toEqual(
      expect.arrayContaining([
        "credentials.openai",
        "provider.openai.auth",
        "config.approval_policy",
        "config.sandbox_mode",
        "config.web_search",
        "config.residency",
      ])
    );
    expect(inventory.runtimeReadiness?.issues.find((issue) => issue.id === "credentials.openai")?.action).toBe(
      "Sign in to ChatGPT on the connected machine."
    );
  });

  test("writes batch runtime config through codex when supported", async () => {
    const store = new WorkspaceSnapshotStore(
      makeDemoWorkspaceSnapshot("cli", {
        state: "paired",
      })
    );
    const runtime = new CodexBridgeRuntime({
      runtimeTarget: "cli",
      workspaceStore: store,
      cwd: "/Users/dhruv2mars/dev/github/offdex",
    });
    const calls: string[] = [];
    let currentConfig = {
      model: "gpt-5.4",
      model_provider: "openai",
      model_reasoning_effort: "high",
      sandbox_mode: "workspace-write",
      approval_policy: "on-request",
      web_search: "cached",
    };

    runtime.client.ensureConnected = async () => {};
    runtime.client.subscribe = () => () => {};
    runtime.client.subscribeToServerRequests = () => () => {};
    runtime.client.writeConfigValues = async (edits) => {
      calls.push(edits.map((edit) => `${edit.keyPath}:${String(edit.value)}`).join(","));
      currentConfig = {
        ...currentConfig,
        ...Object.fromEntries(edits.map((edit) => [edit.keyPath, edit.value])),
      };
      return {
        filePath: "/Users/dhruv2mars/.codex/config.toml",
        status: "updated",
        version: "2",
      };
    };
    runtime.client.listApps = async () => [];
    runtime.client.listModels = async () => [];
    runtime.client.readConfig = async () => currentConfig;
    runtime.client.readConfigRequirements = async () => null;
    runtime.client.readAuthStatus = async () => ({ authMethod: "chatgpt", requiresOpenaiAuth: false });
    runtime.client.readAccount = async () => ({
      id: "acct-1",
      email: "dev@example.com",
      name: "Dev",
      planType: "plus",
      isAuthenticated: true,
    });
    runtime.client.listPlugins = async () => [];
    runtime.client.listSkills = async () => [];

    const inventory = await runtime.writeConfigValues([
      { keyPath: "approval_policy", value: "never" },
      { keyPath: "web_search", value: "live" },
    ]);

    expect(calls).toEqual(["approval_policy:never,web_search:live"]);
    expect(inventory.config?.approvalPolicy).toBe("never");
    expect(inventory.config?.webSearch).toBe("live");
    expect(inventory.runtimeReadiness?.status).toBe("ready");
  });

  test("installs and uninstalls plugins through codex", async () => {
    const store = new WorkspaceSnapshotStore(
      makeDemoWorkspaceSnapshot("cli", {
        state: "paired",
      })
    );
    const runtime = new CodexBridgeRuntime({
      runtimeTarget: "cli",
      workspaceStore: store,
      cwd: "/Users/dhruv2mars/dev/github/offdex",
    });
    const calls: string[] = [];
    let installed = false;

    runtime.client.ensureConnected = async () => {};
    runtime.client.subscribe = () => () => {};
    runtime.client.subscribeToServerRequests = () => () => {};
    runtime.client.installPlugin = async (marketplacePath: string, pluginName: string) => {
      calls.push(`install:${marketplacePath}:${pluginName}`);
      installed = true;
      return {};
    };
    runtime.client.uninstallPlugin = async (pluginId: string) => {
      calls.push(`uninstall:${pluginId}`);
      installed = false;
      return {};
    };
    runtime.client.listApps = async () => [];
    runtime.client.listModels = async () => [];
    runtime.client.readConfig = async () => null;
    runtime.client.listSkills = async () => [];
    runtime.client.listMcpServers = async () => [];
    runtime.client.readRateLimits = async () => null;
    runtime.client.listExperimentalFeatures = async () => [];
    runtime.client.listPlugins = async () => [
      {
        name: "default",
        path: "/Users/dhruv2mars/.codex/plugins",
        plugins: [
          {
            id: "linear@openai-curated",
            name: "linear",
            enabled: installed,
            installed,
            installPolicy: "AVAILABLE",
            authPolicy: "ON_INSTALL",
            interface: {
              displayName: "Linear",
              shortDescription: "Find issues",
              screenshots: [],
            },
            source: {
              type: "local",
              path: "/Users/dhruv2mars/.codex/plugins/linear",
            },
          },
        ],
      },
    ];

    const afterInstall = await runtime.installPlugin({
      marketplacePath: "/Users/dhruv2mars/.codex/.tmp/plugins/.agents/plugins/marketplace.json",
      pluginName: "linear",
    });
    const afterUninstall = await runtime.uninstallPlugin("linear@openai-curated");

    expect(calls).toEqual([
      "install:/Users/dhruv2mars/.codex/.tmp/plugins/.agents/plugins/marketplace.json:linear",
      "uninstall:linear@openai-curated",
    ]);
    expect(afterInstall.plugins[0]?.installed).toBe(true);
    expect(afterUninstall.plugins[0]?.installed).toBe(false);
  });

  test("resolves MCP elicitation requests through the runtime", async () => {
    const store = new WorkspaceSnapshotStore(
      makeDemoWorkspaceSnapshot("cli", {
        state: "paired",
      })
    );
    const runtime = new CodexBridgeRuntime({
      runtimeTarget: "cli",
      workspaceStore: store,
      cwd: "/Users/dhruv2mars/dev/github/offdex",
    });
    const responses: unknown[] = [];
    let serverRequestListener: ((request: { id: number | string; method: string; params?: unknown }) => void) | null = null;

    runtime.client.ensureConnected = async () => {};
    runtime.client.subscribe = () => () => {};
    runtime.client.subscribeToServerRequests = (listener) => {
      serverRequestListener = listener;
      return () => {
        serverRequestListener = null;
      };
    };
    runtime.client.respondToServerRequest = (_id, result) => {
      responses.push(result);
    };

    await runtime.readWorkbenchInventory();

    expect(serverRequestListener).not.toBeNull();
    serverRequestListener!({
      id: "elicitation-1",
      method: "mcpServer/elicitation/request",
      params: {
        serverName: "vercel",
        threadId: "thread-1",
        turnId: "turn-1",
        mode: "form",
        message: "Need deployment target",
        requestedSchema: {
          type: "object",
          properties: {
            target: {
              type: "string",
            },
          },
        },
      },
    });

    const approval = store.getSnapshot().pendingApprovals[0];
    expect(approval?.method).toBe("mcpServer/elicitation/request");

    await runtime.resolveApproval("elicitation-1", {
      approve: true,
      answers: {
        target: "preview",
      },
    });

    expect(responses[0]).toEqual({
      action: "accept",
      content: {
        target: "preview",
      },
    });
  });

  test("resolves legacy command approvals through the runtime", async () => {
    const store = new WorkspaceSnapshotStore(
      makeDemoWorkspaceSnapshot("cli", {
        state: "paired",
      })
    );
    const runtime = new CodexBridgeRuntime({
      runtimeTarget: "cli",
      workspaceStore: store,
      cwd: "/Users/dhruv2mars/dev/github/offdex",
    });
    const responses: unknown[] = [];
    let serverRequestListener: ((request: { id: number | string; method: string; params?: unknown }) => void) | null = null;

    runtime.client.ensureConnected = async () => {};
    runtime.client.subscribe = () => () => {};
    runtime.client.subscribeToServerRequests = (listener) => {
      serverRequestListener = listener;
      return () => {
        serverRequestListener = null;
      };
    };
    runtime.client.respondToServerRequest = (_id, result) => {
      responses.push(result);
    };

    await runtime.readWorkbenchInventory();

    expect(serverRequestListener).not.toBeNull();
    serverRequestListener!({
      id: "legacy-exec-1",
      method: "execCommandApproval",
      params: {
        approvalId: "approval-1",
        callId: "call-1",
        command: ["curl", "-I", "https://example.com"],
        conversationId: "thread-1",
        cwd: "/Users/dhruv2mars/dev/github/offdex",
        parsedCmd: [],
      },
    });

    const approval = store.getSnapshot().pendingApprovals[0];
    expect(approval?.method).toBe("execCommandApproval");

    await runtime.resolveApproval("legacy-exec-1", {
      approve: true,
    });

    expect(responses[0]).toEqual({
      decision: "approved",
    });
  });

  test("resolves modern file permissions through the runtime", async () => {
    const store = new WorkspaceSnapshotStore(
      makeDemoWorkspaceSnapshot("cli", {
        state: "paired",
      })
    );
    const runtime = new CodexBridgeRuntime({
      runtimeTarget: "cli",
      workspaceStore: store,
      cwd: "/Users/dhruv2mars/dev/github/offdex",
    });
    const responses: unknown[] = [];
    let serverRequestListener: ((request: { id: number | string; method: string; params?: unknown }) => void) | null = null;

    runtime.client.ensureConnected = async () => {};
    runtime.client.subscribe = () => () => {};
    runtime.client.subscribeToServerRequests = (listener) => {
      serverRequestListener = listener;
      return () => {
        serverRequestListener = null;
      };
    };
    runtime.client.respondToServerRequest = (_id, result) => {
      responses.push(result);
    };

    await runtime.readWorkbenchInventory();

    expect(serverRequestListener).not.toBeNull();
    serverRequestListener!({
      id: "file-approval-1",
      method: "item/fileChange/requestApproval",
      params: {
        threadId: "thread-1",
        turnId: "turn-1",
        itemId: "item-1",
      },
    });

    await runtime.resolveApproval("file-approval-1", {
      approve: true,
    });

    expect(responses[0]).toEqual({
      decision: "accept",
    });
  });

  test("resumes a missing thread before starting review", async () => {
    const store = new WorkspaceSnapshotStore(
      makeDemoWorkspaceSnapshot("cli", {
        state: "paired",
      })
    );
    store.replaceSnapshot({
      ...store.getSnapshot(),
      threads: [
        {
          id: "thread-source",
          title: "Source thread",
          projectLabel: "offdex",
          threadKind: "conversation",
          sourceThreadId: null,
          reviewThreadId: null,
          summary: {
            messageCount: 0,
            commandCount: 0,
            toolActivityCount: 0,
            reasoningCount: 0,
            diffTurnCount: 0,
            latestAssistantText: null,
            pendingApprovalCount: 0,
            activePermissionReviewCount: 0,
            failedTurnCount: 0,
          },
          runtimeTarget: "cli",
          state: "completed",
          unreadCount: 0,
          updatedAt: "Now",
          path: null,
          cwd: "/Users/dhruv2mars/dev/github/offdex",
          cliVersion: "0.116.0",
          source: "appServer",
          agentNickname: null,
          agentRole: null,
          gitInfo: null,
          messages: [],
          turns: [],
        },
      ],
    });
    const runtime = new CodexBridgeRuntime({
      runtimeTarget: "cli",
      workspaceStore: store,
      cwd: "/Users/dhruv2mars/dev/github/offdex",
    });

    runtime.client.ensureConnected = async () => {};
    runtime.client.subscribe = () => () => {};
    runtime.client.subscribeToServerRequests = () => () => {};
    runtime.client.listThreads = async () => [
      {
        id: "thread-review",
        preview: "Review me",
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
        name: "Review me",
        turns: [],
      },
    ];
    runtime.client.readThread = async (threadId: string) => ({
      id: threadId,
      preview: threadId === "thread-review" ? "Review me" : "Source thread",
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
      name: threadId === "thread-review" ? "Review me" : "Source thread",
      turns:
        threadId === "thread-review"
          ? [{ id: "turn-review", items: [], status: "inProgress", error: null }]
          : [],
    });
    runtime.client.readAccount = async () => ({
      id: "acct-1",
      email: "dev@example.com",
      name: "Dev",
      planType: "pro",
      isAuthenticated: true,
    });

    let resumeCalled = false;
    runtime.client.resumeThread = async () => {
      resumeCalled = true;
      return {
        id: "thread-source",
        preview: "Source thread",
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
        name: "Source thread",
        turns: [],
      };
    };
    let reviewAttempts = 0;
    runtime.client.startReview = async (threadId: string) => {
      reviewAttempts += 1;
      if (reviewAttempts === 1) {
        throw new Error(`thread not found: ${threadId}`);
      }
      return {
        reviewThreadId: "thread-review",
        turn: { id: "turn-review", items: [], status: "inProgress", error: null },
      };
    };

    const snapshot = await runtime.startReview("thread-source");

    expect(resumeCalled).toBe(true);
    expect(reviewAttempts).toBe(2);
    expect(snapshot.threads[0]?.id).toBe("thread-review");
    expect(snapshot.threads[0]?.threadKind).toBe("review");
    expect(snapshot.threads[0]?.sourceThreadId).toBe("thread-source");
    expect(snapshot.threads.find((thread) => thread.id === "thread-source")?.reviewThreadId).toBe("thread-review");
  });

  test("resumes a missing thread before compacting", async () => {
    const store = new WorkspaceSnapshotStore(
      makeDemoWorkspaceSnapshot("cli", {
        state: "paired",
      })
    );
    const runtime = new CodexBridgeRuntime({
      runtimeTarget: "cli",
      workspaceStore: store,
      cwd: "/Users/dhruv2mars/dev/github/offdex",
    });

    runtime.client.ensureConnected = async () => {};
    runtime.client.subscribe = () => () => {};
    runtime.client.subscribeToServerRequests = () => () => {};
    runtime.client.listThreads = async (_cwd: string, options?: { archived?: boolean }) =>
      options?.archived
        ? []
        : [
            {
              id: "thread-compact",
              preview: "Compact me",
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
              name: "Compact me",
              turns: [],
            },
          ];
    runtime.client.readThread = async (threadId: string) => ({
      id: threadId,
      preview: "Compact me",
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
      name: "Compact me",
      turns: [{ id: "turn-compact", items: [], status: "inProgress", error: null }],
    });
    runtime.client.readAccount = async () => ({
      id: "acct-1",
      email: "dev@example.com",
      name: "Dev",
      planType: "pro",
      isAuthenticated: true,
    });

    let resumeCalled = false;
    runtime.client.resumeThread = async () => {
      resumeCalled = true;
      return {
        id: "thread-compact",
        preview: "Compact me",
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
        name: "Compact me",
        turns: [],
      };
    };
    let compactAttempts = 0;
    runtime.client.compactThread = async () => {
      compactAttempts += 1;
      if (compactAttempts === 1) {
        throw new Error("thread not found: thread-compact");
      }
      return {};
    };

    const snapshot = await runtime.compactThread("thread-compact");

    expect(resumeCalled).toBe(true);
    expect(compactAttempts).toBe(2);
    expect(snapshot.threads[0]?.id).toBe("thread-compact");
  });
});
