import { describe, expect, test } from "bun:test";
import type { OffdexMachineRecord } from "@offdex/protocol";
import { resolveMachineConnection } from "../src/bridge-client";

function makeMachine(): OffdexMachineRecord {
  return {
    machineId: "machine-1",
    macName: "Studio Mac",
    ownerId: "owner-1",
    ownerLabel: "Codex on this Mac",
    runtimeTarget: "cli",
    lastSeenAt: "Just now",
    online: true,
    directBridgeUrls: ["http://10.0.0.2:42420", "http://127.0.0.1:42420"],
    localBridgeUrl: "http://127.0.0.1:42420",
    capabilityMatrix: { mobile: "expo", web: "next", runtimes: ["cli"] },
    remoteCapability: {
      controlPlaneUrl: "https://control.offdex.dev",
      machineId: "machine-1",
      directBridgeUrls: ["http://10.0.0.2:42420", "http://127.0.0.1:42420"],
      relayUrl: "https://control.offdex.dev",
      relayRoomId: "room-1",
    },
  };
}

describe("machine session client", () => {
  test("uses a reachable local bridge before relay", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "http://10.0.0.2:42420/health") {
        return new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }) as Promise<Response>;
      }
      if (url === "http://127.0.0.1:42420/health") {
        return Response.json({ ok: true });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    try {
      await expect(resolveMachineConnection(makeMachine())).resolves.toEqual({
        machine: expect.objectContaining({ machineId: "machine-1" }),
        connectionLabel: "Studio Mac",
        connectionTarget: "http://127.0.0.1:42420",
        connectionTransport: "local",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("falls back to relay when local bridge probes fail", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => Response.json({ error: "offline" }, { status: 503 })) as unknown as typeof fetch;

    try {
      await expect(
        resolveMachineConnection(makeMachine(), {
          ticketId: "ticket-1",
          machineId: "machine-1",
          ownerId: "owner-1",
          transportMode: "relay",
          issuedAt: "now",
          expiresAt: "later",
          local: { bridgeUrls: ["http://10.0.0.2:42420"] },
          relay: {
            relayUrl: "https://control.offdex.dev",
            roomId: "room-1",
            secret: "secret-1",
          },
        })
      ).resolves.toEqual({
        machine: expect.objectContaining({ machineId: "machine-1" }),
        connectionLabel: "Studio Mac",
        connectionTarget: expect.stringContaining("offdex-relay://connect?"),
        connectionTransport: "relay",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
