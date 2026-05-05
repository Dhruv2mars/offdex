import { describe, expect, test } from "bun:test";
import {
  decodeDirectConnectionTarget,
  toBridgeLiveUrl,
  decodeRelayConnectionTarget,
  encodeDirectConnectionTarget,
  encodeRelayConnectionTarget,
  cancelBridgeAccountLogin,
  fetchBridgeInventory,
  logoutBridgeAccount,
  resolveManagedConnection,
  normalizeBridgeBaseUrl,
  startBridgeAccountLogin,
} from "../src/bridge-client";

describe("bridge client", () => {
  test("defaults to localhost bridge", () => {
    expect(normalizeBridgeBaseUrl("")).toBe("http://127.0.0.1:42420");
  });

  test("adds a scheme when the host is bare", () => {
    expect(normalizeBridgeBaseUrl("192.168.1.10:42420/")).toBe(
      "http://192.168.1.10:42420"
    );
  });

  test("preserves explicit schemes", () => {
    expect(normalizeBridgeBaseUrl("https://bridge.local/")).toBe(
      "https://bridge.local"
    );
  });

  test("maps bridge http urls to websocket live urls", () => {
    expect(toBridgeLiveUrl("http://192.168.1.10:42420")).toBe(
      "ws://192.168.1.10:42420/live"
    );
    expect(toBridgeLiveUrl("https://bridge.local")).toBe(
      "wss://bridge.local/live"
    );
  });

  test("encodes and decodes a direct connection target", () => {
    const target = encodeDirectConnectionTarget({
      bridgeUrl: "http://192.168.1.8:42420",
      accessToken: "token-123",
    });

    expect(decodeDirectConnectionTarget(target)).toEqual({
      bridgeUrl: "http://192.168.1.8:42420",
      accessToken: "token-123",
    });
    expect(toBridgeLiveUrl(target)).toBe("ws://192.168.1.8:42420/live?ticket=token-123");
  });

  test("encodes and decodes a relay connection target", () => {
    const target = encodeRelayConnectionTarget({
      bridgeUrl: "http://192.168.1.8:42420",
      macName: "studio-macbook",
      relay: {
        relayUrl: "wss://relay.example.com",
        roomId: "room-123",
        secret: "secret-456",
      },
      version: 2,
    });

    expect(decodeRelayConnectionTarget(target)).toEqual({
      bridgeUrl: "http://192.168.1.8:42420",
      macName: "studio-macbook",
      relay: {
        relayUrl: "wss://relay.example.com",
        roomId: "room-123",
        secret: "secret-456",
      },
      version: 2,
    });
  });

  test("maps https relay targets to secure websocket urls", () => {
    const target = encodeRelayConnectionTarget({
      bridgeUrl: "http://192.168.1.8:42420",
      macName: "studio-macbook",
      relay: {
        relayUrl: "https://relay.example.com",
        roomId: "room-123",
        secret: "secret-456",
      },
      version: 2,
    });

    expect(toBridgeLiveUrl(target)).toContain(
      "wss://relay.example.com/ws/room-123"
    );
  });

  test("fetches runtime inventory from a direct bridge", async () => {
    const originalFetch = globalThis.fetch;
    const requests: string[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      requests.push(url);
      if (url !== "http://127.0.0.1:42420/inventory") {
        throw new Error(`Unexpected fetch: ${url}`);
      }

      return new Response(
        JSON.stringify({
          codeHome: "/Users/dhruv2mars/.codex",
          plugins: [],
          skills: [
            {
              id: "tdd",
              name: "tdd",
              path: "/Users/dhruv2mars/.agents/skills/tdd/SKILL.md",
              source: "agents",
            },
          ],
          mcpServers: [],
          automations: [],
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    try {
      const inventory = await fetchBridgeInventory("127.0.0.1:42420");

      expect(requests).toEqual(["http://127.0.0.1:42420/inventory"]);
      expect(inventory.skills[0]?.name).toBe("tdd");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("posts Codex account controls to a direct bridge", async () => {
    const originalFetch = globalThis.fetch;
    const requests: Array<{ url: string; body: string | null }> = [];

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({
        url,
        body: typeof init?.body === "string" ? init.body : null,
      });

      if (url.endsWith("/account/login/start")) {
        return new Response(
          JSON.stringify({
            session: {
              type: "chatgpt",
              loginId: "login-123",
              authUrl: "https://auth.openai.com/login-123",
            },
          }),
          { status: 200 }
        );
      }

      if (url.endsWith("/account/login/cancel")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      if (url.endsWith("/account/logout")) {
        return new Response(
          JSON.stringify({
            snapshot: {
              account: null,
            },
          }),
          { status: 200 }
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    try {
      const login = await startBridgeAccountLogin("127.0.0.1:42420");
      await cancelBridgeAccountLogin("127.0.0.1:42420", login.session.loginId);
      const logout = await logoutBridgeAccount("127.0.0.1:42420");

      expect(login.session.loginId).toBe("login-123");
      expect(logout.snapshot.account).toBeNull();
      expect(requests).toEqual([
        {
          url: "http://127.0.0.1:42420/account/login/start",
          body: JSON.stringify({ type: "chatgpt" }),
        },
        {
          url: "http://127.0.0.1:42420/account/login/cancel",
          body: JSON.stringify({ loginId: "login-123" }),
        },
        {
          url: "http://127.0.0.1:42420/account/logout",
          body: null,
        },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("managed connection falls through to a later local url when the first probe times out", async () => {
    const originalFetch = globalThis.fetch;
    const responses: string[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      responses.push(url);

      if (url === "http://control.test/v1/connections/ticket") {
        return new Response(
          JSON.stringify({
            ticket: {
              local: {
                bridgeUrls: ["http://10.0.0.2:42420", "http://127.0.0.1:42420"],
              },
              relay: null,
            },
          }),
          { status: 200 }
        );
      }

      if (url === "http://control.test/v1/machines") {
        return new Response(
          JSON.stringify({
            session: {},
            machines: [
              {
                machineId: "machine-1",
                macName: "d2m.local",
                ownerId: "owner-1",
                ownerLabel: "Codex on this Mac",
                runtimeTarget: "cli",
                lastSeenAt: "Just now",
                online: true,
                directBridgeUrls: ["http://10.0.0.2:42420", "http://127.0.0.1:42420"],
                localBridgeUrl: "http://127.0.0.1:42420",
                capabilityMatrix: { mobile: "expo", web: "next", runtimes: ["cli"] },
                remoteCapability: {
                  controlPlaneUrl: "http://control.test",
                  machineId: "machine-1",
                  directBridgeUrls: ["http://10.0.0.2:42420", "http://127.0.0.1:42420"],
                  relayUrl: "http://control.test",
                  relayRoomId: "room-1",
                },
              },
            ],
          }),
          { status: 200 }
        );
      }

      if (url === "http://10.0.0.2:42420/health") {
        return new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }) as Promise<Response>;
      }

      if (url === "http://127.0.0.1:42420/health") {
        return new Response(
          JSON.stringify({
            ok: true,
            transport: "bridge",
            bridgeUrl: "http://127.0.0.1:42420",
            bridgeHints: ["http://127.0.0.1:42420"],
            macName: "d2m.local",
            desktopAvailable: false,
            session: null,
          }),
          { status: 200 }
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    try {
      const resolved = await resolveManagedConnection({
        controlPlaneUrl: "http://control.test",
        machineId: "machine-1",
        token: "session-token",
        ownerId: "owner-1",
        ownerLabel: "Codex on this Mac",
        deviceId: "device-1",
      });

      expect(resolved.connectionLabel).toBe("d2m.local");
      expect(resolved.connectionTransport).toBe("local");
      expect(responses).toContain("http://10.0.0.2:42420/health");
      expect(responses).toContain("http://127.0.0.1:42420/health");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
