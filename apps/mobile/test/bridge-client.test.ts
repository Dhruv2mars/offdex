import { describe, expect, test } from "bun:test";
import {
  decodeDirectConnectionTarget,
  toBridgeLiveUrl,
  decodeRelayConnectionTarget,
  encodeDirectConnectionTarget,
  encodeRelayConnectionTarget,
  resolveManagedConnection,
  normalizeBridgeBaseUrl,
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

  test("managed connection falls through to a later direct url when the first probe times out", async () => {
    const originalFetch = globalThis.fetch;
    const responses: string[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      responses.push(url);

      if (url === "http://control.test/v1/connections/ticket") {
        return new Response(
          JSON.stringify({
            ticket: {
              direct: {
                accessToken: "token-123",
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

      expect(resolved.connectionLabel).toBe("http://127.0.0.1:42420");
      expect(resolved.connectionTransport).toBe("direct");
      expect(responses).toContain("http://10.0.0.2:42420/health");
      expect(responses).toContain("http://127.0.0.1:42420/health");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
