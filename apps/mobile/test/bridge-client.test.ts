import { describe, expect, test } from "bun:test";
import {
  normalizeBridgeBaseUrl,
  toBridgeLiveUrl,
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
});
