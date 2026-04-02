import { describe, expect, test } from "bun:test";
import {
  OFFDEX_NEW_THREAD_ID,
  makeDemoWorkspaceSnapshot,
  type OffdexMachineRecord,
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
  const machines = [makeManagedMachine()];
  let interruptedThreadId: string | null = null;
  let sentThreadId: string | null = null;
  let healthRequestCount = 0;
  let failHealthRequests = 0;
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
        session: null,
      };
    },
    async fetchBridgeSnapshot() {
      return snapshot;
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
                    runtimeTarget: "cli",
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
      return {
        session,
        machines,
      };
    },
    async resolveManagedConnection(_session, machineId) {
      return {
        machine: machines.find((machine) => machine.machineId === machineId) ?? machines[0],
        connectionTarget: "offdex-direct://connect?bridge=http%3A%2F%2F192.168.1.8%3A42420&token=token-123",
        connectionLabel: "http://192.168.1.8:42420",
        connectionTransport: "direct" as const,
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
    getSentThreadId() {
      return sentThreadId;
    },
    getHealthRequestCount() {
      return healthRequestCount;
    },
    failNextHealthRequests(count = 1) {
      failHealthRequests = count;
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

    expect(controller.getState().connectionTransport).toBe("direct");
    expect(controller.getState().connectedBridgeUrl).toBe("http://192.168.1.8:42420");
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
    expect(controller.getState().connectionTransport).toBe("direct");
    expect(controller.getState().connectedBridgeUrl).toBe("http://192.168.1.8:42420");
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
