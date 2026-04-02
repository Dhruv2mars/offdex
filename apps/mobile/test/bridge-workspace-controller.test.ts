import { describe, expect, test } from "bun:test";
import { makeDemoWorkspaceSnapshot } from "@offdex/protocol";
import {
  BridgeWorkspaceController,
  type BridgeClient,
  type BridgePreferencesStore,
} from "../src/bridge-workspace-controller";

function createFakePreferences(savedBridgeUrl: string | null = null): BridgePreferencesStore {
  let value = savedBridgeUrl;

  return {
    async getBridgeBaseUrl() {
      return value;
    },
    async setBridgeBaseUrl(nextValue: string) {
      value = nextValue;
    },
  };
}

function createFakeClient() {
  const snapshot = makeDemoWorkspaceSnapshot("cli");
  let interruptedThreadId: string | null = null;
  let liveHandlers:
    | {
        onSnapshot: (nextSnapshot: typeof snapshot) => void;
        onStatusChange?: (status: "open" | "closed" | "error") => void;
      }
    | undefined;

  const client: BridgeClient = {
    async fetchBridgeHealth() {
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
      return {
        snapshot: {
          ...snapshot,
          threads: snapshot.threads.map((thread, index) =>
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
  };
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

  test("falls back to demo turns when no bridge is connected", async () => {
    const controller = new BridgeWorkspaceController({
      preferences: createFakePreferences(),
      client: createFakeClient().client,
    });

    await controller.sendTurn("thread-foundation", "Keep the fallback usable.");

    const thread = controller
      .getState()
      .snapshot.threads.find((entry) => entry.id === "thread-foundation");

    expect(thread?.messages.at(-2)?.body).toBe("Keep the fallback usable.");
    expect(thread?.messages.at(-1)?.role).toBe("assistant");
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

  test("connects from an offdex pairing link", async () => {
    const fakeClient = createFakeClient();
    const controller = new BridgeWorkspaceController({
      preferences: createFakePreferences(),
      client: fakeClient.client,
    });

    await controller.connectFromPairingUri(
      "offdex://pair?bridge=http%3A%2F%2F192.168.1.8%3A42420&name=studio-macbook&v=1"
    );

    expect(controller.getState().connectedBridgeUrl).toBe("http://192.168.1.8:42420");
    expect(controller.getState().snapshot.pairing.macName).toBe("studio-macbook");
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
