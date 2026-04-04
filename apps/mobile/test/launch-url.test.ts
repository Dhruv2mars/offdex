import { describe, expect, test } from "bun:test";
import { createLaunchUrlGate } from "../src/launch-url";

describe("createLaunchUrlGate", () => {
  test("accepts the first non-empty url", () => {
    const gate = createLaunchUrlGate();

    expect(gate(" offdex://pair?foo=bar ")).toBe("offdex://pair?foo=bar");
  });

  test("drops duplicate launch urls", () => {
    const gate = createLaunchUrlGate();

    expect(gate("offdex://pair?foo=bar")).toBe("offdex://pair?foo=bar");
    expect(gate("offdex://pair?foo=bar")).toBeNull();
  });

  test("drops blank launch urls", () => {
    const gate = createLaunchUrlGate();

    expect(gate("   ")).toBeNull();
    expect(gate(null)).toBeNull();
  });
});
