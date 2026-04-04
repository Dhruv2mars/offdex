import { describe, expect, test } from "bun:test";
import { resolveInitialPairingUri } from "../src/initial-pairing";

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
});
