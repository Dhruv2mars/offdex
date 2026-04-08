import { describe, expect, test } from "bun:test";
import { ControlPlaneRoom, createCloudflareRelayWorker } from "../src";

function createTestRoom() {
  const values = new Map<string, unknown>();
  return new ControlPlaneRoom(
    {
      storage: {
        async get(key: string) {
          return values.get(key);
        },
        async put(key: string, value: unknown) {
          values.set(key, value);
        },
      },
    } as unknown as DurableObjectState,
    {
      PUBLIC_URL: "https://offdex-control.workers.dev",
    } as never
  );
}

describe("cloudflare relay worker", () => {
  test("exposes a Cloudflare Worker handler and Durable Object entrypoint", () => {
    const worker = createCloudflareRelayWorker();

    expect(typeof worker.fetch).toBe("function");
    expect(typeof worker.ControlPlaneRoom).toBe("function");
  });

  test("registers, claims, and issues local-first relay fallback tickets", async () => {
    const room = createTestRoom();

    const registerResponse = await room.fetch(
      new Request("https://worker.test/v1/machines/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          machineId: "machine-1",
          machineSecret: "secret-1",
          macName: "Studio Mac",
          ownerId: "codex-user-1",
          ownerLabel: "dhruv@example.com",
          bridgeUrl: "http://192.168.1.8:42420",
          bridgeHints: ["http://192.168.1.8:42420"],
          runtimeTarget: "cli",
        }),
      })
    );
    const registerPayload = (await registerResponse.json()) as {
      pairing: { claimCode: string };
      machine: { remoteCapability: { controlPlaneUrl: string } };
    };

    expect(registerResponse.ok).toBe(true);
    expect(registerPayload.machine.remoteCapability.controlPlaneUrl).toBe(
      "https://offdex-control.workers.dev"
    );

    const claimResponse = await room.fetch(
      new Request("https://worker.test/v1/pairing/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          claimCode: registerPayload.pairing.claimCode,
          deviceLabel: "Dhruv Pixel",
        }),
      })
    );
    const claimPayload = (await claimResponse.json()) as {
      session: { token: string };
    };

    expect(claimResponse.ok).toBe(true);

    const ticketResponse = await room.fetch(
      new Request("https://worker.test/v1/connections/ticket", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${claimPayload.session.token}`,
        },
        body: JSON.stringify({ machineId: "machine-1" }),
      })
    );
    const ticketPayload = (await ticketResponse.json()) as {
      ticket: {
        transportMode: string;
        local: { bridgeUrls: string[] } | null;
        relay: { relayUrl: string; roomId: string; secret: string } | null;
      };
    };

    expect(ticketResponse.ok).toBe(true);
    expect(ticketPayload.ticket.transportMode).toBe("local");
    expect(ticketPayload.ticket.local?.bridgeUrls).toEqual(["http://192.168.1.8:42420"]);
    expect(ticketPayload.ticket.relay?.relayUrl).toBe("https://offdex-control.workers.dev");
  });

  test("serves browser-safe CORS headers for web pairing clients", async () => {
    const room = createTestRoom();

    const optionsResponse = await room.fetch(
      new Request("https://worker.test/v1/pairing/claim", {
        method: "OPTIONS",
        headers: {
          origin: "https://offdexapp.vercel.app",
          "access-control-request-method": "POST",
        },
      })
    );
    const healthResponse = await room.fetch(new Request("https://worker.test/health"));

    expect(optionsResponse.status).toBe(204);
    expect(optionsResponse.headers.get("access-control-allow-origin")).toBe("*");
    expect(optionsResponse.headers.get("access-control-allow-methods")).toContain("POST");
    expect(optionsResponse.headers.get("access-control-allow-headers")).toContain("authorization");
    expect(healthResponse.headers.get("access-control-allow-origin")).toBe("*");
  });
});
