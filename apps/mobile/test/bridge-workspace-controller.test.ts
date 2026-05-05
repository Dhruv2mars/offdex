import { describe, expect, test } from "bun:test";
import {
  OFFDEX_NEW_THREAD_ID,
  makeDemoWorkspaceSnapshot,
  type OffdexMachineRecord,
  type OffdexWorkbenchInventory,
} from "@offdex/protocol";
import type { ManagedBridgeSession } from "../src/bridge-client";
import {
  BridgeWorkspaceController,
  type BridgeClient,
  type BridgePreferencesStore,
  type BridgeTimerDriver,
} from "../src/bridge-workspace-controller";

function createFakePreferences(savedBridgeUrl: string | null = null): BridgePreferencesStore & {
  readPairingUri(): string | null;
  readManagedSession(): ManagedBridgeSession | null;
  wasCleared(): boolean;
} {
  let value = savedBridgeUrl;
  let pairingUri: string | null = null;
  let managedSession: ManagedBridgeSession | null = null;
  let cleared = false;

  return {
    async getBridgeBaseUrl() {
      return value;
    },
    async setBridgeBaseUrl(nextValue: string) {
      value = nextValue;
    },
    async getPairingUri() {
      return pairingUri;
    },
    async setPairingUri(nextValue: string | null) {
      pairingUri = nextValue;
    },
    async clearPairing() {
      cleared = true;
      value = null;
      pairingUri = null;
      managedSession = null;
    },
    async getManagedSession() {
      return managedSession;
    },
    async setManagedSession(nextValue: ManagedBridgeSession | null) {
      managedSession = nextValue;
    },
    readPairingUri() {
      return pairingUri;
    },
    readManagedSession() {
      return managedSession;
    },
    wasCleared() {
      return cleared;
    },
  };
}

function makeManagedMachine(machineId = "machine-123"): OffdexMachineRecord {
  return {
    machineId,
    macName: "studio-macbook",
    ownerId: "owner-123",
    ownerLabel: "dhruv@example.com",
    runtimeTarget: "cli",
    lastSeenAt: "Just now",
    online: true,
    directBridgeUrls: ["http://192.168.1.8:42420"],
    localBridgeUrl: "http://192.168.1.8:42420",
    capabilityMatrix: {
      mobile: "expo",
      web: "next",
      runtimes: ["cli"],
    },
    remoteCapability: {
      controlPlaneUrl: "https://control.offdex.app",
      machineId,
      directBridgeUrls: ["http://192.168.1.8:42420"],
      relayUrl: "https://control.offdex.app",
      relayRoomId: "room-123",
    },
  };
}

function createFakeClient() {
  const snapshot = makeDemoWorkspaceSnapshot("cli");
  let machines = [makeManagedMachine()];
  let interruptedThreadId: string | null = null;
  let sentThreadId: string | null = null;
  let archivedThreadId: string | null = null;
  let compactedThreadId: string | null = null;
  let rollbackRequest: { threadId: string; numTurns: number } | null = null;
  let canceledLoginId: string | null = null;
  let logoutRequestCount = 0;
  let diffCwd: string | null | undefined;
  let inventoryRequestCount = 0;
  let healthRequestCount = 0;
  let managedListRequestCount = 0;
  let failHealthRequests = 0;
  let failManagedListRequests = 0;
  let failArchiveRequests = 0;
  let liveHandlers:
    | {
        onSnapshot: (nextSnapshot: typeof snapshot) => void;
        onStatusChange?: (status: "open" | "closed" | "error") => void;
      }
    | undefined;

  const client: BridgeClient = {
    async fetchBridgeHealth() {
      healthRequestCount += 1;
      if (failHealthRequests > 0) {
        failHealthRequests -= 1;
        throw new Error("Bridge offline");
      }

      return {
        ok: true,
        transport: "bridge",
        bridgeUrl: "http://192.168.1.8:42420",
        bridgeHints: ["http://192.168.1.8:42420", "http://127.0.0.1:42420"],
        macName: "studio-macbook",
        desktopAvailable: false,
        codexAccount: {
          id: "owner-123",
          email: "dhruv@example.com",
          name: "Dhruv",
          planType: "plus",
          isAuthenticated: true,
        },
        session: null,
      };
    },
    async fetchBridgeSnapshot() {
      return snapshot;
    },
    async fetchBridgeInventory() {
      inventoryRequestCount += 1;
      return {
        codeHome: "/Users/dhruv2mars/.codex",
        plugins: [
          {
            id: "browser-use",
            name: "Browser Use",
            path: "/Users/dhruv2mars/.codex/plugins/browser-use",
            enabled: true,
            source: "local",
          },
        ],
        skills: [
          {
            id: "tdd",
            name: "tdd",
            path: "/Users/dhruv2mars/.agents/skills/tdd/SKILL.md",
            source: "agents",
            description: "Test-driven development",
          },
        ],
        mcpServers: [
          {
            name: "github",
            authStatus: "oAuth",
            toolCount: 4,
            resourceCount: 2,
            resourceTemplateCount: 1,
          },
        ],
        automations: [],
        config: {
          model: "gpt-5.2",
          modelProvider: "openai",
          reasoningEffort: "medium",
          sandboxMode: "danger-full-access",
          approvalPolicy: "never",
          webSearch: "enabled",
        },
        rateLimits: {
          limitId: "plus",
          limitName: "Plus",
          planType: "plus",
          primary: {
            usedPercent: 42,
            windowDurationMins: 300,
            resetsAt: null,
          },
          secondary: null,
          credits: null,
        },
      } satisfies OffdexWorkbenchInventory;
    },
    async startBridgeAccountLogin() {
      return {
        session: {
          type: "chatgpt",
          loginId: "login-123",
          authUrl: "https://auth.openai.com/login-123",
        },
      };
    },
    async cancelBridgeAccountLogin(_baseUrl, loginId) {
      canceledLoginId = loginId;
      return { ok: true };
    },
    async logoutBridgeAccount() {
      logoutRequestCount += 1;
      return {
        snapshot: {
          ...snapshot,
          account: null,
        },
      };
    },
    async selectBridgeRuntime(_baseUrl, preferredTarget) {
      return {
        snapshot: {
          ...snapshot,
          pairing: {
            ...snapshot.pairing,
            runtimeTarget: preferredTarget,
          },
        },
      };
    },
    async sendBridgeTurn(_baseUrl, _threadId, body) {
      sentThreadId = _threadId;
      return {
        snapshot: {
          ...snapshot,
          threads:
            _threadId === OFFDEX_NEW_THREAD_ID
              ? [
                {
                  id: "thread-fresh",
                  title: "Fresh mobile chat",
                  projectLabel: "offdex",
                  threadKind: "conversation",
                  sourceThreadId: null,
                  reviewThreadId: null,
                  summary: {
                    messageCount: 1,
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
                  path: null,
                  cwd: null,
                  cliVersion: null,
                  source: "bridge",
                  agentNickname: null,
                  agentRole: null,
                  gitInfo: null,
                  state: "running",
                  unreadCount: 0,
                  updatedAt: "Now",
                  messages: [
                    {
                        id: "bridge-user",
                        role: "user",
                        body,
                        createdAt: "Now",
                      },
                    ],
                    turns: [],
                  },
                  ...snapshot.threads,
                ]
              : snapshot.threads.map((thread, index) =>
                  index === 0
                    ? {
                        ...thread,
                        messages: [
                          ...thread.messages,
                          {
                            id: "bridge-user",
                            role: "user",
                            body,
                            createdAt: "Now",
                          },
                        ],
                      }
                    : thread
                ),
        },
      };
    },
    async interruptBridgeTurn(_baseUrl, threadId) {
      interruptedThreadId = threadId;
      return {
        snapshot: {
          ...snapshot,
          threads: snapshot.threads.map((thread, index) =>
            index === 0
              ? {
                  ...thread,
                  state: "idle",
                }
              : thread
          ),
        },
      };
    },
    async archiveBridgeThread(_baseUrl, threadId) {
      archivedThreadId = threadId;
      if (failArchiveRequests > 0) {
        failArchiveRequests -= 1;
        throw new Error("Archive denied");
      }
      return {
        snapshot: {
          ...snapshot,
          threads: snapshot.threads.filter((thread) => thread.id !== threadId),
          archivedThreads: [
            snapshot.threads.find((thread) => thread.id === threadId) ?? snapshot.threads[0],
          ],
        },
      };
    },
    async unarchiveBridgeThread(_baseUrl, threadId) {
      return {
        snapshot: {
          ...snapshot,
          archivedThreads: snapshot.archivedThreads.filter((thread) => thread.id !== threadId),
        },
      };
    },
    async compactBridgeThread(_baseUrl, threadId) {
      compactedThreadId = threadId;
      return { snapshot };
    },
    async rollbackBridgeThread(_baseUrl, threadId, numTurns) {
      rollbackRequest = { threadId, numTurns };
      return { snapshot };
    },
    async fetchRemoteDiff(_baseUrl, cwd) {
      diffCwd = cwd;
      return {
        sha: "abc123",
        diff: "diff --git a/file.ts b/file.ts\n+mobile parity",
      };
    },
    subscribeToBridgeSnapshots(_baseUrl, handlers) {
      liveHandlers = handlers;
      return () => {
        liveHandlers = undefined;
      };
    },
    async claimManagedPairing(remote) {
      return {
        session: {
          controlPlaneUrl: remote.controlPlaneUrl,
          machineId: remote.machineId,
          token: "session-token-123",
          ownerId: "owner-123",
          ownerLabel: remote.ownerLabel,
          deviceId: "device-123",
        },
        machines,
      };
    },
    async listManagedMachines(session) {
      managedListRequestCount += 1;
      if (failManagedListRequests > 0) {
        failManagedListRequests -= 1;
        throw new TypeError("Network request failed");
      }
      return {
        session,
        machines,
      };
    },
    async resolveManagedConnection(_session, machineId) {
      return {
        machine: machines.find((machine) => machine.machineId === machineId) ?? machines[0],
        connectionTarget: "http://192.168.1.8:42420",
        connectionLabel: "studio-macbook",
        connectionTransport: "local" as const,
      };
    },
  };

  return {
    client,
    emitSnapshot(nextSnapshot: typeof snapshot) {
      liveHandlers?.onSnapshot(nextSnapshot);
    },
    emitStatus(status: "open" | "closed" | "error") {
      liveHandlers?.onStatusChange?.(status);
    },
    getInterruptedThreadId() {
      return interruptedThreadId;
    },
    getArchivedThreadId() {
      return archivedThreadId;
    },
    getCompactedThreadId() {
      return compactedThreadId;
    },
    getRollbackRequest() {
      return rollbackRequest;
    },
    getCanceledLoginId() {
      return canceledLoginId;
    },
    getLogoutRequestCount() {
      return logoutRequestCount;
    },
    getDiffCwd() {
      return diffCwd;
    },
    getInventoryRequestCount() {
      return inventoryRequestCount;
    },
    getSentThreadId() {
      return sentThreadId;
    },
    getHealthRequestCount() {
      return healthRequestCount;
    },
    getManagedListRequestCount() {
      return managedListRequestCount;
    },
    setMachines(nextMachines: OffdexMachineRecord[]) {
      machines = nextMachines;
    },
    failNextHealthRequests(count = 1) {
      failHealthRequests = count;
    },
    failNextManagedListRequests(count = 1) {
      failManagedListRequests = count;
    },
    failNextArchiveRequests(count = 1) {
      failArchiveRequests = count;
    },
  };
}

function createFakeTimerDriver() {
  let now = 1;
  let nextId = 1;
  const timers = new Map<number, { runAt: number; callback: () => void }>();

  const timer: BridgeTimerDriver = {
    setTimeout(callback, delayMs) {
      const id = nextId++;
      timers.set(id, { runAt: now + delayMs, callback });
      return id;
    },
    clearTimeout(timerId) {
      timers.delete(timerId as number);
    },
  };

  return {
    timer,
    runNext() {
      const nextEntry = [...timers.entries()].sort((left, right) => left[1].runAt - right[1].runAt)[0];
      if (!nextEntry) {
        return false;
      }

      const [id, scheduled] = nextEntry;
      timers.delete(id);
      now = scheduled.runAt;
      scheduled.callback();
      return true;
    },
    getPendingCount() {
      return timers.size;
    },
  };
}

async function flushAsyncWork(rounds = 6) {
  for (let index = 0; index < rounds; index += 1) {
    await Promise.resolve();
  }
}

describe("bridge workspace controller", () => {
  test("hydrates the saved bridge url and auto-connects", async () => {
    const fakeClient = createFakeClient();
    const controller = new BridgeWorkspaceController({
      preferences: createFakePreferences("192.168.1.8:42420"),
      client: fakeClient.client,
    });

    await controller.hydrate();

    expect(controller.getState().bridgeBaseUrl).toBe("http://192.168.1.8:42420");
    expect(controller.getState().connectedBridgeUrl).toBe("http://192.168.1.8:42420");
    expect(controller.getState().connectionState).toBe("live");
    expect(controller.getState().snapshot.pairing.state).toBe("paired");
    expect(controller.getState().codexAccount?.email).toBe("dhruv@example.com");
  });

  test("hydrates the saved pairing uri before the raw bridge url", async () => {
    const fakeClient = createFakeClient();
    const preferences = createFakePreferences("192.168.1.8:42420");
    await preferences.setPairingUri?.(
      "offdex://pair?bridge=http%3A%2F%2F192.168.1.8%3A42420&name=studio-macbook&relay=wss%3A%2F%2Frelay.example.com&room=room-123&secret=secret-456&v=2"
    );
    const controller = new BridgeWorkspaceController({
      preferences,
      client: fakeClient.client,
    });

    await controller.hydrate();

    expect(controller.getState().bridgeBaseUrl).toBe("http://192.168.1.8:42420");
    expect(controller.getState().connectedBridgeUrl).toBe("wss://relay.example.com");
    expect(controller.getState().snapshot.pairing.macName).toBe("studio-macbook");
  });

  test("refuses to send turns until a bridge is connected", async () => {
    const controller = new BridgeWorkspaceController({
      preferences: createFakePreferences(),
      client: createFakeClient().client,
    });

    await expect(
      controller.sendTurn("thread-foundation", "Keep the fallback usable.")
    ).rejects.toThrow("Connect to your Mac first.");

    const thread = controller
      .getState()
      .snapshot.threads.find((entry) => entry.id === "thread-foundation");

    expect(thread?.messages.at(-1)?.body).not.toBe("Keep the fallback usable.");
    expect(controller.getState().bridgeStatus).toBe("Connect to your Mac first.");
  });

  test("pushes connected turns through the bridge and accepts live updates", async () => {
    const fakeClient = createFakeClient();
    const controller = new BridgeWorkspaceController({
      preferences: createFakePreferences(),
      client: fakeClient.client,
    });

    await controller.connect("http://127.0.0.1:42420");
    await controller.sendTurn("thread-foundation", "Ship it live.");
    fakeClient.emitStatus("open");
    fakeClient.emitSnapshot({
      ...makeDemoWorkspaceSnapshot("cli"),
      threads: [
        {
          ...makeDemoWorkspaceSnapshot("cli").threads[0],
          id: "thread-live",
          title: "Live thread",
          messages: [
            {
              id: "assistant-live",
              role: "assistant",
              body: "OFFDEX live",
              createdAt: "Now",
            },
          ],
        },
      ],
    });

    const state = controller.getState();

    expect(state.connectionState).toBe("live");
    expect(state.snapshot.threads[0]?.title).toBe("Live thread");
    expect(state.snapshot.threads[0]?.messages[0]?.body).toBe("OFFDEX live");
  });

  test("marks pairing as reconnecting when live sync drops", async () => {
    const fakeClient = createFakeClient();
    const controller = new BridgeWorkspaceController({
      preferences: createFakePreferences(),
      client: fakeClient.client,
    });

    await controller.connect("http://127.0.0.1:42420");
    fakeClient.emitStatus("closed");

    expect(controller.getState().connectionState).toBe("degraded");
    expect(controller.getState().snapshot.pairing.state).toBe("reconnecting");
  });

  test("reconnects automatically after live sync drops", async () => {
    const fakeClient = createFakeClient();
    const fakeTimer = createFakeTimerDriver();
    const controller = new BridgeWorkspaceController({
      preferences: createFakePreferences(),
      client: fakeClient.client,
      timer: fakeTimer.timer,
    });

    await controller.connect("http://127.0.0.1:42420");
    fakeClient.emitStatus("closed");

    expect(controller.getState().connectionState).toBe("degraded");
    expect(fakeTimer.getPendingCount()).toBe(1);

    fakeTimer.runNext();
    await flushAsyncWork();

    expect(fakeClient.getHealthRequestCount()).toBe(2);
    expect(controller.getState().connectionState).toBe("live");
    expect(controller.getState().snapshot.pairing.state).toBe("paired");
  });

  test("resumes a live bridge immediately when the app returns", async () => {
    const fakeClient = createFakeClient();
    const controller = new BridgeWorkspaceController({
      preferences: createFakePreferences(),
      client: fakeClient.client,
    });

    await controller.connect("http://127.0.0.1:42420");
    await controller.resume();

    expect(fakeClient.getHealthRequestCount()).toBe(2);
    expect(controller.getState().connectionState).toBe("live");
    expect(controller.getState().bridgeStatus).toContain("live at");
  });

  test("keeps retrying after a reconnect failure", async () => {
    const fakeClient = createFakeClient();
    const fakeTimer = createFakeTimerDriver();
    const controller = new BridgeWorkspaceController({
      preferences: createFakePreferences(),
      client: fakeClient.client,
      timer: fakeTimer.timer,
    });

    await controller.connect("http://127.0.0.1:42420");
    fakeClient.failNextHealthRequests(1);
    fakeClient.emitStatus("error");

    fakeTimer.runNext();
    await flushAsyncWork();

    expect(controller.getState().connectionState).toBe("degraded");
    expect(controller.getState().bridgeStatus).toContain("Retrying");
    expect(fakeTimer.getPendingCount()).toBe(1);

    fakeTimer.runNext();
    await flushAsyncWork();

    expect(controller.getState().connectionState).toBe("live");
    expect(controller.getState().snapshot.pairing.state).toBe("paired");
  });

  test("resumes a degraded bridge without waiting for the timer", async () => {
    const fakeClient = createFakeClient();
    const fakeTimer = createFakeTimerDriver();
    const controller = new BridgeWorkspaceController({
      preferences: createFakePreferences(),
      client: fakeClient.client,
      timer: fakeTimer.timer,
    });

    await controller.connect("http://127.0.0.1:42420");
    fakeClient.emitStatus("closed");

    expect(controller.getState().connectionState).toBe("degraded");
    expect(fakeTimer.getPendingCount()).toBe(1);

    await controller.resume();

    expect(fakeTimer.getPendingCount()).toBe(0);
    expect(fakeClient.getHealthRequestCount()).toBe(2);
    expect(controller.getState().connectionState).toBe("live");
  });

  test("connects from an offdex pairing link", async () => {
    const fakeClient = createFakeClient();
    const preferences = createFakePreferences();
    const controller = new BridgeWorkspaceController({
      preferences,
      client: fakeClient.client,
    });

    await controller.connectFromPairingUri(
      "offdex://pair?bridge=http%3A%2F%2F192.168.1.8%3A42420&name=studio-macbook&v=1"
    );

    expect(controller.getState().connectedBridgeUrl).toBe("http://192.168.1.8:42420");
    expect(controller.getState().snapshot.pairing.macName).toBe("studio-macbook");
    expect(preferences.readPairingUri()).toBe(
      "offdex://pair?bridge=http%3A%2F%2F192.168.1.8%3A42420&name=studio-macbook&v=1"
    );
  });

  test("claims a managed pairing link once and persists the trusted device session", async () => {
    const fakeClient = createFakeClient();
    const preferences = createFakePreferences();
    const controller = new BridgeWorkspaceController({
      preferences,
      client: fakeClient.client,
    });

    await controller.connectFromPairingUri(
      "offdex://pair?bridge=http%3A%2F%2F192.168.1.8%3A42420&name=studio-macbook&control=https%3A%2F%2Fcontrol.offdex.app&machine=machine-123&claim=claim-123&owner=dhruv%40example.com&v=3"
    );

    expect(controller.getState().connectionTransport).toBe("local");
    expect(controller.getState().connectedBridgeUrl).toBe("studio-macbook");
    expect(preferences.readManagedSession()).toEqual({
      controlPlaneUrl: "https://control.offdex.app",
      machineId: "machine-123",
      token: "session-token-123",
      ownerId: "owner-123",
      ownerLabel: "dhruv@example.com",
      deviceId: "device-123",
    });
  });

  test("hydrates a saved managed device session and reconnects without scanning again", async () => {
    const fakeClient = createFakeClient();
    const preferences = createFakePreferences();
    await preferences.setManagedSession?.({
      controlPlaneUrl: "https://control.offdex.app",
      machineId: "machine-123",
      token: "session-token-123",
      ownerId: "owner-123",
      ownerLabel: "dhruv@example.com",
      deviceId: "device-123",
    });
    const controller = new BridgeWorkspaceController({
      preferences,
      client: fakeClient.client,
    });

    await controller.hydrate();

    expect(controller.getState().connectionState).toBe("live");
    expect(controller.getState().connectionTransport).toBe("local");
    expect(controller.getState().connectedBridgeUrl).toBe("studio-macbook");
  });

  test("hydrates a saved managed session failure without surfacing an unhandled startup error", async () => {
    const fakeClient = createFakeClient();
    fakeClient.failNextManagedListRequests();
    const preferences = createFakePreferences();
    await preferences.setManagedSession?.({
      controlPlaneUrl: "https://control.offdex.app",
      machineId: "machine-123",
      token: "session-token-123",
      ownerId: "owner-123",
      ownerLabel: "dhruv@example.com",
      deviceId: "device-123",
    });
    const controller = new BridgeWorkspaceController({
      preferences,
      client: fakeClient.client,
    });

    await expect(controller.hydrate()).resolves.toMatchObject({
      connectionState: "degraded",
      managedSession: {
        machineId: "machine-123",
      },
      bridgeStatus: "Network request failed",
    });
  });

  test("refreshes the trusted machine list without reconnecting", async () => {
    const fakeClient = createFakeClient();
    const preferences = createFakePreferences();
    await preferences.setManagedSession?.({
      controlPlaneUrl: "https://control.offdex.app",
      machineId: "machine-123",
      token: "session-token-123",
      ownerId: "owner-123",
      ownerLabel: "dhruv@example.com",
      deviceId: "device-123",
    });
    const controller = new BridgeWorkspaceController({
      preferences,
      client: fakeClient.client,
    });

    await controller.hydrate();
    fakeClient.setMachines([
      makeManagedMachine(),
      makeManagedMachine("machine-456"),
    ]);

    await controller.refreshManagedMachines();

    expect(fakeClient.getManagedListRequestCount()).toBe(2);
    expect(controller.getState().machines).toHaveLength(2);
    expect(controller.getState().connectedBridgeUrl).toBe("studio-macbook");
  });

  test("disconnect clears the saved pairing trust", async () => {
    const fakeClient = createFakeClient();
    const preferences = createFakePreferences();
    const controller = new BridgeWorkspaceController({
      preferences,
      client: fakeClient.client,
    });

    await controller.connectFromPairingUri(
      "offdex://pair?bridge=http%3A%2F%2F192.168.1.8%3A42420&name=studio-macbook&v=1"
    );
    controller.disconnect();

    expect(preferences.wasCleared()).toBe(true);
    expect(controller.getState().connectionState).toBe("idle");
  });

  test("disconnect keeps a late bridge connect from restoring the session", async () => {
    const snapshot = makeDemoWorkspaceSnapshot("cli");
    let resolveHealth!: (value: Awaited<ReturnType<BridgeClient["fetchBridgeHealth"]>>) => void;
    let resolveSnapshot!: (
      value: Awaited<ReturnType<BridgeClient["fetchBridgeSnapshot"]>>
    ) => void;

    const client: BridgeClient = {
      ...createFakeClient().client,
      fetchBridgeHealth() {
        return new Promise((resolve) => {
          resolveHealth = resolve;
        });
      },
      fetchBridgeSnapshot() {
        return new Promise((resolve) => {
          resolveSnapshot = resolve;
        });
      },
    };

    const controller = new BridgeWorkspaceController({
      preferences: createFakePreferences(),
      client,
    });

    const connectPromise = controller.connect("http://127.0.0.1:42420");
    await flushAsyncWork();

    expect(controller.getState().connectionState).toBe("connecting");
    expect(controller.getState().isBusy).toBe(true);

    controller.disconnect();

    resolveHealth({
      ok: true,
      transport: "bridge",
      bridgeUrl: "http://127.0.0.1:42420",
      bridgeHints: ["http://127.0.0.1:42420"],
      macName: "studio-macbook",
      desktopAvailable: false,
      codexAccount: {
        id: "owner-123",
        email: "dhruv@example.com",
        name: "Dhruv",
        planType: "plus",
        isAuthenticated: true,
      },
      session: null,
    });
    resolveSnapshot(snapshot);

    await connectPromise;
    await flushAsyncWork();

    expect(controller.getState().connectionState).toBe("idle");
    expect(controller.getState().connectedBridgeUrl).toBeNull();
    expect(controller.getState().isBusy).toBe(false);
    expect(controller.getState().trustedPairing).toBe(false);
  });

  test("interrupts a running thread through the bridge", async () => {
    const fakeClient = createFakeClient();
    const controller = new BridgeWorkspaceController({
      preferences: createFakePreferences(),
      client: fakeClient.client,
    });

    await controller.connect("http://127.0.0.1:42420");
    await controller.interruptThread("thread-foundation");

    expect(fakeClient.getInterruptedThreadId()).toBe("thread-foundation");
    expect(controller.getState().bridgeStatus).toContain("Stopping");
  });

  test("starts a fresh thread through the bridge", async () => {
    const fakeClient = createFakeClient();
    const controller = new BridgeWorkspaceController({
      preferences: createFakePreferences(),
      client: fakeClient.client,
    });

    await controller.connect("http://127.0.0.1:42420");
    await controller.sendTurn(OFFDEX_NEW_THREAD_ID, "Open a brand new Codex thread.");

    expect(fakeClient.getSentThreadId()).toBe(OFFDEX_NEW_THREAD_ID);
    expect(controller.getState().snapshot.threads[0]?.id).toBe("thread-fresh");
    expect(controller.getState().snapshot.threads[0]?.messages[0]?.body).toBe(
      "Open a brand new Codex thread."
    );
  });

  test("archives, compacts, rolls back, and reads remote diff through shared bridge endpoints", async () => {
    const fakeClient = createFakeClient();
    const controller = new BridgeWorkspaceController({
      preferences: createFakePreferences(),
      client: fakeClient.client,
    });

    await controller.connect("http://127.0.0.1:42420");
    await controller.archiveThread("thread-foundation");
    await controller.compactThread("thread-foundation");
    await controller.rollbackThread("thread-foundation", 1);
    const diff = await controller.fetchRemoteDiff("/Users/dhruv2mars/dev/github/offdex");

    expect(fakeClient.getArchivedThreadId()).toBe("thread-foundation");
    expect(fakeClient.getCompactedThreadId()).toBe("thread-foundation");
    expect(fakeClient.getRollbackRequest()).toEqual({
      threadId: "thread-foundation",
      numTurns: 1,
    });
    expect(fakeClient.getDiffCwd()).toBe("/Users/dhruv2mars/dev/github/offdex");
    expect(diff.diff).toContain("+mobile parity");
  });

  test("loads runtime inventory through the connected bridge", async () => {
    const fakeClient = createFakeClient();
    const controller = new BridgeWorkspaceController({
      preferences: createFakePreferences(),
      client: fakeClient.client,
    });

    await controller.connect("http://127.0.0.1:42420");
    const inventory = await controller.refreshInventory();

    expect(fakeClient.getInventoryRequestCount()).toBe(1);
    expect(inventory.skills[0]?.name).toBe("tdd");
    expect(controller.getState().inventory?.config?.model).toBe("gpt-5.2");
    expect(controller.getState().bridgeStatus).toBe("Runtime inventory loaded.");
  });

  test("starts, cancels, and logs out Codex account sessions through the bridge", async () => {
    const fakeClient = createFakeClient();
    const controller = new BridgeWorkspaceController({
      preferences: createFakePreferences(),
      client: fakeClient.client,
    });

    await controller.connect("http://127.0.0.1:42420");
    const session = await controller.startAccountLogin();

    expect(session.authUrl).toBe("https://auth.openai.com/login-123");
    expect(controller.getState().accountLoginSession?.loginId).toBe("login-123");

    await controller.cancelAccountLogin();

    expect(fakeClient.getCanceledLoginId()).toBe("login-123");
    expect(controller.getState().accountLoginSession).toBeNull();

    await controller.logoutAccount();

    expect(fakeClient.getLogoutRequestCount()).toBe(1);
    expect(controller.getState().codexAccount).toBeNull();
    expect(controller.getState().bridgeStatus).toBe("Codex account logged out.");
  });

  test("surfaces bridge action failures in controller status", async () => {
    const fakeClient = createFakeClient();
    const controller = new BridgeWorkspaceController({
      preferences: createFakePreferences(),
      client: fakeClient.client,
    });

    await controller.connect("http://127.0.0.1:42420");
    fakeClient.failNextArchiveRequests();

    await expect(controller.archiveThread("thread-foundation")).rejects.toThrow("Archive denied");
    expect(controller.getState().bridgeStatus).toBe("Archive denied");
    expect(controller.getState().isBusy).toBe(false);
  });

  test("switches runtime through the connected bridge", async () => {
    const fakeClient = createFakeClient();
    const controller = new BridgeWorkspaceController({
      preferences: createFakePreferences(),
      client: fakeClient.client,
    });

    await controller.connect("http://127.0.0.1:42420");
    await controller.setRuntimeTarget("desktop");

    expect(controller.getState().runtimeTarget).toBe("desktop");
  });
});
