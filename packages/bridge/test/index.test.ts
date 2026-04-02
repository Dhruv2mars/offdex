import { afterEach, describe, expect, test } from "bun:test";
import {
  createRelayAuthToken,
  decryptRelayPayload,
  encryptRelayPayload,
} from "@offdex/protocol";
import {
  createBridgeStartupOutput,
  BridgeSessionStore,
  buildBridgeHints,
  createBridgeSession,
  createBridgeStateStore,
  createTerminalPairingOutput,
  createBridgeWorkspaceStore,
  resolveRuntimeTarget,
  startBridgeServer,
} from "../src";

const activeBridges: Array<ReturnType<typeof startBridgeServer>> = [];

afterEach(() => {
  while (activeBridges.length > 0) {
    activeBridges.pop()?.stop();
  }
});

describe("bridge runtime resolution", () => {
  test("keeps desktop when macOS desktop runtime is available", () => {
    const resolved = resolveRuntimeTarget({
      hostPlatform: "darwin",
      preferredTarget: "desktop",
      desktopAvailable: true,
    });

    expect(resolved.target).toBe("desktop");
  });

  test("falls back to cli when desktop is unavailable", () => {
    const resolved = resolveRuntimeTarget({
      hostPlatform: "linux",
      preferredTarget: "desktop",
      desktopAvailable: false,
    });

    expect(resolved.target).toBe("cli");
    expect(resolved.reason).toContain("Falling back");
  });
});

describe("bridge session store", () => {
  test("tracks the active session", () => {
    const store = new BridgeSessionStore();
    const session = createBridgeSession("ABC-123", "cli");

    store.connect(session);
    expect(store.getActiveSession()).toEqual(session);

    store.disconnect();
    expect(store.getActiveSession()).toBeNull();
  });
});

describe("bridge workspace store", () => {
  test("builds local bridge hints with lan and loopback addresses", () => {
    const hints = buildBridgeHints(
      42420,
      () => ({
        en0: [
          {
            address: "192.168.1.8",
            family: "IPv4",
            internal: false,
          },
        ],
        lo0: [
          {
            address: "127.0.0.1",
            family: "IPv4",
            internal: true,
          },
        ],
      }),
      () => "studio-macbook"
    );

    expect(hints[0]).toBe("http://192.168.1.8:42420");
    expect(hints).toContain("http://studio-macbook.local:42420");
    expect(hints).toContain("http://127.0.0.1:42420");
  });

  test("does not double-append the local suffix", () => {
    const hints = buildBridgeHints(
      42420,
      () => ({}),
      () => "d2m.local"
    );

    expect(hints).toContain("http://d2m.local:42420");
    expect(hints).not.toContain("http://d2m.local.local:42420");
  });

  test("starts with a foundation thread", () => {
    const store = createBridgeWorkspaceStore();

    expect(store.getSnapshot().threads[0]?.id).toBe("thread-foundation");
  });

  test("accepts a turn over http and persists it in the snapshot", async () => {
    const bridge = startBridgeServer({ host: "127.0.0.1", port: 0 });
    activeBridges.push(bridge);
    const baseUrl = `http://127.0.0.1:${bridge.server.port}`;

    const response = await fetch(`${baseUrl}/turn`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        threadId: "thread-foundation",
        body: "Wire this phone into the live bridge.",
      }),
    });

    expect(response.ok).toBe(true);

    const payload = (await response.json()) as {
      snapshot: ReturnType<typeof bridge.workspaceStore.getSnapshot>;
    };
    const thread = payload.snapshot.threads.find((entry) => entry.id === "thread-foundation");

    expect(thread?.messages.at(-2)?.body).toBe("Wire this phone into the live bridge.");
    expect(thread?.messages.at(-1)?.role).toBe("assistant");
  });

  test("serves browser-safe cors headers for web clients", async () => {
    const bridge = startBridgeServer({ host: "127.0.0.1", port: 0 });
    activeBridges.push(bridge);
    const baseUrl = `http://127.0.0.1:${bridge.server.port}`;

    const optionsResponse = await fetch(`${baseUrl}/runtime`, {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:8083",
        "access-control-request-method": "POST",
      },
    });
    const healthResponse = await fetch(`${baseUrl}/health`, {
      headers: {
        origin: "http://localhost:8083",
      },
    });

    expect(optionsResponse.status).toBe(204);
    expect(optionsResponse.headers.get("access-control-allow-origin")).toBe("*");
    expect(optionsResponse.headers.get("access-control-allow-private-network")).toBe("true");
    expect(healthResponse.headers.get("access-control-allow-origin")).toBe("*");
  });

  test("publishes a local pairing payload and deep link", async () => {
    const bridge = startBridgeServer({ host: "127.0.0.1", port: 0 });
    activeBridges.push(bridge);
    const baseUrl = `http://127.0.0.1:${bridge.server.port}`;

    const response = await fetch(`${baseUrl}/pairing.json`);
    const payload = (await response.json()) as {
      bridgeUrl: string;
      bridgeHints: string[];
      pairingUri: string;
      macName: string;
    };

    expect(response.ok).toBe(true);
    expect(payload.bridgeHints.length).toBeGreaterThan(0);
    expect(payload.bridgeUrl).toContain(String(bridge.server.port));
    expect(payload.pairingUri.startsWith("offdex://pair?")).toBe(true);
    expect(payload.macName.length).toBeGreaterThan(0);
  });

  test("publishes relay details when remote pairing is enabled", async () => {
    const bridge = startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      relayUrl: "wss://relay.example.com",
      bridgeStateStore: createBridgeStateStore({
        initialState: {
          bridgeId: "bridge-123",
          bridgeSecret: "secret-123",
          relayRoomId: "room-123",
          relayUrl: "wss://relay.example.com",
          createdAt: "2026-04-02T00:00:00.000Z",
        },
      }),
    });
    activeBridges.push(bridge);
    const baseUrl = `http://127.0.0.1:${bridge.server.port}`;

    const response = await fetch(`${baseUrl}/pairing.json`);
    const payload = (await response.json()) as {
      pairingUri: string;
    };

    expect(payload.pairingUri).toContain("relay=wss%3A%2F%2Frelay.example.com");
    expect(payload.pairingUri).toContain("room=room-123");
    expect(payload.pairingUri).toContain("secret=secret-123");
  });

  test("answers encrypted relay proxy requests through the configured room", async () => {
    const { startRelayServer } = await import("../../relay/src");
    const relay = startRelayServer({ host: "127.0.0.1", port: 0 });
    const relayUrl = `ws://127.0.0.1:${relay.server.port}`;
    const bridge = startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      relayUrl,
      bridgeStateStore: createBridgeStateStore({
        initialState: {
          bridgeId: "bridge-123",
          bridgeSecret: "secret-123",
          relayRoomId: "room-123",
          relayUrl,
          createdAt: "2026-04-02T00:00:00.000Z",
        },
      }),
    });
    activeBridges.push(bridge);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const response = await fetch(
      `http://127.0.0.1:${relay.server.port}/proxy/room-123?token=${createRelayAuthToken("secret-123", "room-123")}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          payload: JSON.stringify(
            encryptRelayPayload("secret-123", {
              id: "req-1",
              action: "health",
            })
          ),
        }),
      }
    );

    const body = (await response.json()) as { payload: string };
    expect(response.ok).toBe(true);
    const health = decryptRelayPayload<{ ok: boolean; relayConnected: boolean }>(
      "secret-123",
      JSON.parse(body.payload)
    );

    expect(health.ok).toBe(true);
    expect(health.relayConnected).toBe(true);

    relay.stop();
  });
});

describe("bridge state store", () => {
  test("reuses the same persisted bridge identity", async () => {
    const store = createBridgeStateStore();

    const first = await store.loadOrCreate({
      relayUrl: "wss://relay.example.com",
      macName: "studio-macbook",
    });
    const second = await store.loadOrCreate({
      relayUrl: "wss://relay.example.com",
      macName: "studio-macbook",
    });

    expect(second.bridgeId).toBe(first.bridgeId);
    expect(second.bridgeSecret).toBe(first.bridgeSecret);
    expect(second.relayRoomId).toBe(first.relayRoomId);
  });

  test("renders terminal pairing output with the deep link", async () => {
    const output = await createTerminalPairingOutput(
      "offdex://pair?bridge=http%3A%2F%2F127.0.0.1%3A42420&name=This%20Mac&v=1"
    );

    expect(output).toContain("offdex://pair?");
    expect(output.length).toBeGreaterThan(50);
  });

  test("renders bridge startup details above the pairing qr", async () => {
    const output = await createBridgeStartupOutput({
      payload: {
        bridgeUrl: "http://127.0.0.1:42420",
        bridgeHints: ["http://127.0.0.1:42420", "http://studio-mac.local:42420"],
        macName: "studio-mac",
        pairingUri:
          "offdex://pair?bridge=http%3A%2F%2F127.0.0.1%3A42420&name=studio-mac&v=1",
      },
      relayUrl: "wss://relay.example.com",
    });

    expect(output).toContain("Offdex Bridge");
    expect(output).toContain("Pairing page: http://127.0.0.1:42420/pairing");
    expect(output).toContain("Secure relay: wss://relay.example.com");
    expect(output).toContain("offdex://pair?");
  });
});
