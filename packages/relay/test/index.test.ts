import { describe, expect, test } from "bun:test";
import { RelayRegistry } from "../src";

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
});
