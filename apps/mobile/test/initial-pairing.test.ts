import { describe, expect, test } from "bun:test";
import {
  initializeWorkspaceFromLaunch,
  resolveInitialPairingUri,
} from "../src/initial-pairing";

describe("resolveInitialPairingUri", () => {
  test("returns the first valid pairing link", () => {
    expect(
      resolveInitialPairingUri([
        null,
        "https://example.com",
        " offdex://pair?bridge=http%3A%2F%2F127.0.0.1%3A42420 ",
      ])
    ).toBe("offdex://pair?bridge=http%3A%2F%2F127.0.0.1%3A42420");
  });

  test("returns null when no pairing link exists", () => {
    expect(resolveInitialPairingUri(["", "https://example.com", null])).toBeNull();
  });

  test("falls back to normal initialization when launch pairing fails", async () => {
    let initialized = 0;
    let errors = 0;

    const result = await initializeWorkspaceFromLaunch({
      candidates: ["offdex://pair?bridge=http%3A%2F%2F127.0.0.1%3A42420"],
      async connectFromPairingUri() {
        throw new Error("Bridge offline");
      },
      async initialize() {
        initialized += 1;
      },
      onError() {
        errors += 1;
      },
    });

    expect(result).toBe("initialized-after-pairing-error");
    expect(initialized).toBe(1);
    expect(errors).toBe(1);
  });

  test("skips normal initialization after a successful launch pairing", async () => {
    let initialized = 0;
    let connected = 0;

    const result = await initializeWorkspaceFromLaunch({
      candidates: ["offdex://pair?bridge=http%3A%2F%2F127.0.0.1%3A42420"],
      async connectFromPairingUri() {},
      async initialize() {
        initialized += 1;
      },
      onConnected() {
        connected += 1;
      },
    });

    expect(result).toBe("paired");
    expect(initialized).toBe(0);
    expect(connected).toBe(1);
  });
});
