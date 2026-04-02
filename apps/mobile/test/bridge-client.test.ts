import { describe, expect, test } from "bun:test";
import {
  decodeDirectConnectionTarget,
  toBridgeLiveUrl,
  decodeRelayConnectionTarget,
  encodeDirectConnectionTarget,
  encodeRelayConnectionTarget,
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
});
