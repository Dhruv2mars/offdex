import { describe, expect, test } from "bun:test";
import { createRelayAuthToken } from "@offdex/protocol";
import { RelayRegistry, startRelayServer } from "../src";

describe("relay registry", () => {
  test("tracks host and clients per room", () => {
    const relay = new RelayRegistry();

    relay.connectHost("room-1");
    relay.connectClient("room-1", "client-a");
    relay.connectClient("room-1", "client-b");

    expect(relay.snapshot("room-1")).toEqual({
      id: "room-1",
      hostConnected: true,
      clientCount: 2,
    });
  });

  test("updates counts as clients disconnect", () => {
    const relay = new RelayRegistry();

    relay.connectClient("room-2", "client-a");
    relay.disconnectClient("room-2", "client-a");

    expect(relay.snapshot("room-2").clientCount).toBe(0);
  });

  test("starts a relay server on a requested port", () => {
    const relay = startRelayServer({ host: "127.0.0.1", port: 42555 });

    expect(relay.server.port).toBe(42555);
    relay.stop();
  });

  test("proxies an opaque request to the room host and returns the opaque response", async () => {
    const relay = startRelayServer({ host: "127.0.0.1", port: 0 });
    const baseUrl = `http://127.0.0.1:${relay.server.port}`;
    const auth = createRelayAuthToken("secret-123", "room-1");
    const hostSocket = new WebSocket(
      `ws://127.0.0.1:${relay.server.port}/ws/room-1?role=host&clientId=bridge-1&token=${auth}`
    );

    await new Promise<void>((resolve, reject) => {
      hostSocket.onopen = () => resolve();
      hostSocket.onerror = () => reject(new Error("host websocket failed to open"));
    });

    hostSocket.onmessage = (event) => {
      if (typeof event.data !== "string") {
        return;
      }

      const payload = JSON.parse(event.data) as {
        type: string;
        id: string;
        payload: string;
      };

      if (payload.type !== "relay.proxy") {
        return;
      }

      hostSocket.send(
        JSON.stringify({
          type: "relay.response",
          id: payload.id,
          payload: `${payload.payload}-done`,
        })
      );
    };

    const response = await fetch(`${baseUrl}/proxy/room-1?token=${auth}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        payload: "opaque-request",
      }),
    });

    expect(response.ok).toBe(true);
    expect(await response.json()).toEqual({
      payload: "opaque-request-done",
    });

    hostSocket.close();
    relay.stop();
  });

  test("rejects relay proxy requests with the wrong room token", async () => {
    const relay = startRelayServer({ host: "127.0.0.1", port: 0 });
    const baseUrl = `http://127.0.0.1:${relay.server.port}`;
    const auth = createRelayAuthToken("secret-123", "room-1");
    const hostSocket = new WebSocket(
      `ws://127.0.0.1:${relay.server.port}/ws/room-1?role=host&clientId=bridge-1&token=${auth}`
    );

    await new Promise<void>((resolve, reject) => {
      hostSocket.onopen = () => resolve();
      hostSocket.onerror = () => reject(new Error("host websocket failed to open"));
    });

    const response = await fetch(
      `${baseUrl}/proxy/room-1?token=${createRelayAuthToken("wrong-secret", "room-1")}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          payload: "opaque-request",
        }),
      }
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Unauthorized room access.",
    });

    hostSocket.close();
    relay.stop();
  });
});
