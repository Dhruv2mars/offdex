import { describe, expect, test } from "bun:test";
import { WorkspaceSnapshotStore, makeDemoWorkspaceSnapshot } from "@offdex/protocol";
import {
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
    expect(completed.threads.find((entry) => entry.id === "thread-review")?.turns[0]?.items[0]).toMatchObject({
      type: "unknown",
      label: "permission review",
    });
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
      preview: "Review me",
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
      name: "Review me",
      turns: [{ id: "turn-review", items: [], status: "inProgress", error: null }],
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
      };
    };
    let reviewAttempts = 0;
    runtime.client.startReview = async () => {
      reviewAttempts += 1;
      if (reviewAttempts === 1) {
        throw new Error("thread not found: thread-review");
      }
      return {
        reviewThreadId: "thread-review",
        turn: { id: "turn-review", items: [], status: "inProgress", error: null },
      };
    };

    const snapshot = await runtime.startReview("thread-review");

    expect(resumeCalled).toBe(true);
    expect(reviewAttempts).toBe(2);
    expect(snapshot.threads[0]?.id).toBe("thread-review");
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
