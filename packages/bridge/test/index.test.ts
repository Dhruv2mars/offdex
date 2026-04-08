import { afterEach, describe, expect, test } from "bun:test";
import {
  createRelayAuthToken,
  decodePairingUri,
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

  test("publishes managed remote bootstrap details when a control plane is configured", async () => {
    const { createMemoryControlPlaneStateStore, startControlPlaneServer } = await import(
      "../../control-plane/src"
    );
    const controlPlane = startControlPlaneServer({
      host: "127.0.0.1",
      port: 0,
      stateStore: createMemoryControlPlaneStateStore(),
    });
    const controlPlaneUrl = `http://127.0.0.1:${controlPlane.server.port}`;
    const bridge = startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      controlPlaneUrl,
      bridgeStateStore: createBridgeStateStore({
        initialState: {
          bridgeId: "bridge-123",
          bridgeSecret: "secret-123",
          relayRoomId: "room-123",
          relayUrl: null,
          createdAt: "2026-04-02T00:00:00.000Z",
        },
      }),
    });
    activeBridges.push(bridge);
    const baseUrl = `http://127.0.0.1:${bridge.server.port}`;

    await new Promise((resolve) => setTimeout(resolve, 100));

    const response = await fetch(`${baseUrl}/pairing.json`);
    const payload = (await response.json()) as { pairingUri: string };
    const pairing = decodePairingUri(payload.pairingUri);

    expect(pairing.version).toBe(3);
    expect(pairing.remote?.controlPlaneUrl).toBe(controlPlaneUrl);
    expect(pairing.remote?.machineId).toBe("bridge-123");
    expect(pairing.remote?.claimCode.length).toBeGreaterThan(10);

    controlPlane.stop();
  });

  test("uses the control plane advertised public url in managed pairing payloads", async () => {
    const { createMemoryControlPlaneStateStore, startControlPlaneServer } = await import(
      "../../control-plane/src"
    );
    const controlPlane = startControlPlaneServer({
      host: "127.0.0.1",
      port: 0,
      publicUrl: "http://192.168.1.3:42421",
      stateStore: createMemoryControlPlaneStateStore(),
    });
    const bridge = startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      controlPlaneUrl: `http://127.0.0.1:${controlPlane.server.port}`,
      bridgeStateStore: createBridgeStateStore({
        initialState: {
          bridgeId: "bridge-123",
          bridgeSecret: "secret-123",
          relayRoomId: "room-123",
          relayUrl: null,
          createdAt: "2026-04-02T00:00:00.000Z",
        },
      }),
    });
    activeBridges.push(bridge);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const pairing = decodePairingUri(bridge.getPairingPayload().pairingUri);

    expect(pairing.version).toBe(3);
    expect(pairing.remote?.controlPlaneUrl).toBe("http://192.168.1.3:42421");

    controlPlane.stop();
  });

  test("answers managed relay proxy requests through the control plane", async () => {
    const { createMemoryControlPlaneStateStore, startControlPlaneServer } = await import(
      "../../control-plane/src"
    );
    const controlPlane = startControlPlaneServer({
      host: "127.0.0.1",
      port: 0,
      stateStore: createMemoryControlPlaneStateStore(),
    });
    const controlPlaneUrl = `http://127.0.0.1:${controlPlane.server.port}`;
    const bridge = startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      controlPlaneUrl,
      bridgeStateStore: createBridgeStateStore({
        initialState: {
          bridgeId: "bridge-123",
          bridgeSecret: "secret-123",
          relayRoomId: "room-123",
          relayUrl: null,
          createdAt: "2026-04-02T00:00:00.000Z",
        },
      }),
    });
    activeBridges.push(bridge);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const pairing = decodePairingUri(bridge.getPairingPayload().pairingUri);

    const claimResponse = await fetch(`${controlPlaneUrl}/v1/pairing/claim`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        claimCode: pairing.remote?.claimCode,
        deviceLabel: "Pixel",
      }),
    });
    const claimPayload = (await claimResponse.json()) as {
      session: { token: string };
    };

    const ticketResponse = await fetch(`${controlPlaneUrl}/v1/connections/ticket`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${claimPayload.session.token}`,
      },
      body: JSON.stringify({
        machineId: pairing.remote?.machineId,
      }),
    });
    const ticketPayload = (await ticketResponse.json()) as {
      ticket: { relay: { roomId: string; secret: string } };
    };
    await new Promise((resolve) => setTimeout(resolve, 200));

    const response = await fetch(
      `${controlPlaneUrl}/proxy/${ticketPayload.ticket.relay.roomId}?token=${createRelayAuthToken(
        ticketPayload.ticket.relay.secret,
        ticketPayload.ticket.relay.roomId
      )}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          payload: JSON.stringify(
            encryptRelayPayload(ticketPayload.ticket.relay.secret, {
              id: "req-1",
              action: "health",
            })
          ),
        }),
      }
    );

    const body = (await response.json()) as { payload: string };
    expect(response.ok).toBe(true);
    const health = decryptRelayPayload<{ ok: boolean }>(
      ticketPayload.ticket.relay.secret,
      JSON.parse(body.payload)
    );

    expect(health.ok).toBe(true);

    controlPlane.stop();
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
    const health = decryptRelayPayload<{
      ok: boolean;
      relayConnected: boolean;
      transport: string;
      codexAccount?: unknown;
    }>(
      "secret-123",
      JSON.parse(body.payload)
    );

    expect(health.ok).toBe(true);
    expect(health.relayConnected).toBe(true);
    expect(health.transport).toBe("bridge");
    expect(health.codexAccount).toBeNull();

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

  test("renders square terminal pairing output without exposing the deep link", async () => {
    const output = await createTerminalPairingOutput(
      "offdex://pair?bridge=http%3A%2F%2F127.0.0.1%3A42420&name=This%20Mac&v=1"
    );

    expect(output).toContain("Scan with Offdex");
    expect(output).not.toContain("offdex://pair?");
    expect(output).toContain("▀");
    expect(output).not.toContain("\u001b[");
    expect(output.split("\n").length).toBeLessThan(32);
    expect(output.length).toBeGreaterThan(50);
  });

  test("renders minimal product startup details above the pairing qr", async () => {
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

    expect(output).toContain("Offdex is running");
    expect(output).toContain("Scan the QR");
    expect(output).toContain("Bridge: http://127.0.0.1:42420");
    expect(output).toContain("Web UI: https://offdexapp.vercel.app/app?bridge=http%3A%2F%2F127.0.0.1%3A42420");
    expect(output).toContain("pair=offdex%3A%2F%2Fpair");
    expect(output).toContain("Remote: connected");
    expect(output).toContain("offdex status");
    expect(output).not.toContain("Local paths:");
    expect(output).not.toContain("offdex://pair?");
  });
});
