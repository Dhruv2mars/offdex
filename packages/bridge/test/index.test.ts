import { afterEach, describe, expect, test } from "bun:test";
import {
  BridgeSessionStore,
  buildBridgeHints,
  createBridgeSession,
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
    expect(healthResponse.headers.get("access-control-allow-origin")).toBe("*");
  });
});
