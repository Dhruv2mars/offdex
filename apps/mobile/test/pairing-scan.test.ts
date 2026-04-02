import { describe, expect, test } from "bun:test";
import { extractOffdexPairingUri } from "../src/pairing-scan";

describe("pairing scan", () => {
  test("accepts a direct offdex pairing uri", () => {
    expect(
      extractOffdexPairingUri(
        "offdex://pair?bridge=http%3A%2F%2F192.168.1.8%3A42420&name=studio-macbook&v=1"
      )
    ).toBe(
      "offdex://pair?bridge=http%3A%2F%2F192.168.1.8%3A42420&name=studio-macbook&v=1"
    );
  });

  test("trims surrounding whitespace before validating", () => {
    expect(
      extractOffdexPairingUri(
        "  offdex://pair?bridge=http%3A%2F%2F192.168.1.8%3A42420&name=studio-macbook&v=1  "
      )
    ).toBe(
      "offdex://pair?bridge=http%3A%2F%2F192.168.1.8%3A42420&name=studio-macbook&v=1"
    );
  });

  test("rejects non-pairing payloads", () => {
    expect(extractOffdexPairingUri("https://example.com/pairing")).toBeNull();
    expect(extractOffdexPairingUri("")).toBeNull();
  });
});
