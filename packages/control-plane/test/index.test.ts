import { afterEach, describe, expect, test } from "bun:test";
import { createBridgeAccessToken, createRelayAuthToken } from "@offdex/protocol";
import { createMemoryControlPlaneStateStore, startControlPlaneServer } from "../src";

const activeServers: Array<ReturnType<typeof startControlPlaneServer>> = [];

afterEach(() => {
  while (activeServers.length > 0) {
    activeServers.pop()?.stop();
  }
});

describe("control plane", () => {
  test("registers a machine, claims a trusted phone, and lists all owner machines", async () => {
    const controlPlane = startControlPlaneServer({
      host: "127.0.0.1",
      port: 0,
      stateStore: createMemoryControlPlaneStateStore(),
    });
    activeServers.push(controlPlane);
    const baseUrl = `http://127.0.0.1:${controlPlane.server.port}`;

    const registerPrimary = await fetch(`${baseUrl}/v1/machines/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        machineId: "machine-a",
        machineSecret: "machine-secret-a",
        macName: "Studio Mac",
        ownerId: "chatgpt-user-1",
        ownerLabel: "dhruv@example.com",
        bridgeUrl: "http://192.168.1.8:42420",
        bridgeHints: ["http://192.168.1.8:42420", "http://127.0.0.1:42420"],
        runtimeTarget: "cli",
      }),
    });
    const primaryPayload = (await registerPrimary.json()) as {
      machine: { machineId: string; ownerId: string };
      pairing: { claimCode: string };
    };

    const registerSecondary = await fetch(`${baseUrl}/v1/machines/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        machineId: "machine-b",
        machineSecret: "machine-secret-b",
        macName: "Travel Mac",
        ownerId: "chatgpt-user-1",
        ownerLabel: "dhruv@example.com",
        bridgeUrl: "http://192.168.1.9:42420",
        bridgeHints: ["http://192.168.1.9:42420"],
        runtimeTarget: "cli",
      }),
    });

    expect(registerPrimary.ok).toBe(true);
    expect(registerSecondary.ok).toBe(true);
    expect(primaryPayload.machine.ownerId).toBe("chatgpt-user-1");

    const claimResponse = await fetch(`${baseUrl}/v1/pairing/claim`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        claimCode: primaryPayload.pairing.claimCode,
        deviceLabel: "Dhruv Pixel",
      }),
    });
    const claimPayload = (await claimResponse.json()) as {
      session: { token: string; ownerId: string };
      machines: Array<{ machineId: string }>;
    };

    expect(claimResponse.ok).toBe(true);
    expect(claimPayload.session.ownerId).toBe("chatgpt-user-1");
    expect(claimPayload.machines.map((machine) => machine.machineId)).toEqual([
      "machine-a",
      "machine-b",
    ]);

    const meResponse = await fetch(`${baseUrl}/v1/machines`, {
      headers: {
        authorization: `Bearer ${claimPayload.session.token}`,
      },
    });
    const mePayload = (await meResponse.json()) as {
      machines: Array<{ machineId: string; ownerLabel: string }>;
    };

    expect(meResponse.ok).toBe(true);
    expect(mePayload.machines).toHaveLength(2);
    expect(mePayload.machines[0]?.ownerLabel).toBe("dhruv@example.com");
  });

  test("issues direct-first tickets with relay fallback for trusted devices", async () => {
    const controlPlane = startControlPlaneServer({
      host: "127.0.0.1",
      port: 0,
      stateStore: createMemoryControlPlaneStateStore(),
    });
    activeServers.push(controlPlane);
    const baseUrl = `http://127.0.0.1:${controlPlane.server.port}`;

    const registerResponse = await fetch(`${baseUrl}/v1/machines/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        machineId: "machine-a",
        machineSecret: "machine-secret-a",
        macName: "Studio Mac",
        ownerId: "chatgpt-user-1",
        ownerLabel: "dhruv@example.com",
        bridgeUrl: "http://192.168.1.8:42420",
        bridgeHints: ["http://192.168.1.8:42420", "http://127.0.0.1:42420"],
        runtimeTarget: "cli",
      }),
    });
    const registerPayload = (await registerResponse.json()) as {
      pairing: { claimCode: string };
      machine: { relay: { roomId: string; secret: string } };
    };

    const claimResponse = await fetch(`${baseUrl}/v1/pairing/claim`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        claimCode: registerPayload.pairing.claimCode,
        deviceLabel: "Dhruv Pixel",
      }),
    });
    const claimPayload = (await claimResponse.json()) as {
      session: { token: string };
    };

    const ticketResponse = await fetch(`${baseUrl}/v1/connections/ticket`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${claimPayload.session.token}`,
      },
      body: JSON.stringify({
        machineId: "machine-a",
      }),
    });
    const ticketPayload = (await ticketResponse.json()) as {
      ticket: {
        machineId: string;
        transportMode: string;
        direct: { bridgeUrls: string[]; accessToken: string } | null;
        relay: { relayUrl: string; roomId: string; secret: string } | null;
        ticketId: string;
        expiresAt: string;
      };
    };

    expect(ticketResponse.ok).toBe(true);
    expect(ticketPayload.ticket.machineId).toBe("machine-a");
    expect(ticketPayload.ticket.transportMode).toBe("direct");
    expect(ticketPayload.ticket.direct?.bridgeUrls).toContain("http://192.168.1.8:42420");
    expect(ticketPayload.ticket.relay?.roomId).toBe(registerPayload.machine.relay.roomId);
    expect(ticketPayload.ticket.direct).not.toBeNull();
    expect(
      createBridgeAccessToken(
        "machine-secret-a",
        ticketPayload.ticket.ticketId,
        ticketPayload.ticket.expiresAt
      )
    ).toBe(ticketPayload.ticket.direct!.accessToken);
  });

  test("rejects untrusted connection tickets and relays opaque traffic only", async () => {
    const controlPlane = startControlPlaneServer({
      host: "127.0.0.1",
      port: 0,
      stateStore: createMemoryControlPlaneStateStore(),
    });
    activeServers.push(controlPlane);
    const baseUrl = `http://127.0.0.1:${controlPlane.server.port}`;

    const registerResponse = await fetch(`${baseUrl}/v1/machines/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        machineId: "machine-a",
        machineSecret: "machine-secret-a",
        macName: "Studio Mac",
        ownerId: "chatgpt-user-1",
        ownerLabel: "dhruv@example.com",
        bridgeUrl: "http://192.168.1.8:42420",
        bridgeHints: ["http://192.168.1.8:42420"],
        runtimeTarget: "cli",
      }),
    });
    const registerPayload = (await registerResponse.json()) as {
      machine: { relay: { roomId: string; secret: string } };
    };

    const forbiddenResponse = await fetch(`${baseUrl}/v1/connections/ticket`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        machineId: "machine-a",
      }),
    });

    expect(forbiddenResponse.status).toBe(401);

    const roomId = registerPayload.machine.relay.roomId;
    const relaySecret = registerPayload.machine.relay.secret;
    const relayAuth = createRelayAuthToken(relaySecret, roomId);
    const hostSocket = new WebSocket(
      `ws://127.0.0.1:${controlPlane.server.port}/ws/${roomId}?role=host&clientId=bridge-1&token=${relayAuth}`
    );

    await new Promise<void>((resolve, reject) => {
      hostSocket.onopen = () => resolve();
      hostSocket.onerror = () => reject(new Error("host websocket failed to open"));
    });

    hostSocket.onmessage = (event) => {
      if (typeof event.data !== "string") {
        return;
      }

      const payload = JSON.parse(event.data) as { type: string; id: string; payload: string };
      if (payload.type !== "relay.proxy") {
        return;
      }

      hostSocket.send(
        JSON.stringify({
          type: "relay.response",
          id: payload.id,
          payload: JSON.stringify(payload),
        })
      );
    };

    const proxyResponse = await fetch(`${baseUrl}/proxy/${roomId}?token=${relayAuth}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        payload: JSON.stringify({
          nonce: "opaque-nonce",
          ciphertext: "opaque-ciphertext",
        }),
      }),
    });
    const proxyPayload = (await proxyResponse.json()) as { payload: string };

    expect(proxyResponse.ok).toBe(true);
    expect(JSON.parse(proxyPayload.payload)).toEqual({
      type: "relay.proxy",
      id: expect.any(String),
      payload: JSON.stringify({
        nonce: "opaque-nonce",
        ciphertext: "opaque-ciphertext",
      }),
    });

    hostSocket.close();
  });
});
