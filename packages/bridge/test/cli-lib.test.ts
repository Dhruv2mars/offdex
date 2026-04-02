import { describe, expect, test } from "bun:test";
import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  parseArgs,
  parseBridgeMode,
  parsePort,
} from "../src/cli-lib";

describe("bridge cli parser", () => {
  test("uses defaults for the bridge command", () => {
    expect(parseArgs([])).toEqual({
      command: "bridge",
      host: DEFAULT_HOST,
      port: DEFAULT_PORT,
      bridgeMode: "codex",
      controlPlaneUrl: undefined,
    });
  });

  test("parses explicit bridge options", () => {
    expect(
      parseArgs([
        "bridge",
        "--host",
        "127.0.0.1",
        "--port",
        "5555",
        "--mode",
        "demo",
        "--control-plane-url",
        "https://control.offdex.app",
      ])
    ).toEqual({
      command: "bridge",
      host: "127.0.0.1",
      port: 5555,
      bridgeMode: "demo",
      controlPlaneUrl: "https://control.offdex.app",
    });
  });

  test("falls back to environment values", () => {
    expect(
      parseArgs([], {
        OFFDEX_BRIDGE_HOST: "0.0.0.0",
        OFFDEX_BRIDGE_PORT: "4444",
        OFFDEX_BRIDGE_MODE: "demo",
        OFFDEX_CONTROL_PLANE_URL: "https://control.example.com",
      } as NodeJS.ProcessEnv)
    ).toEqual({
      command: "bridge",
      host: "0.0.0.0",
      port: 4444,
      bridgeMode: "demo",
      controlPlaneUrl: "https://control.example.com",
    });
  });

  test("switches to help mode", () => {
    expect(parseArgs(["help"])).toEqual({
      command: "help",
      host: DEFAULT_HOST,
      port: DEFAULT_PORT,
      bridgeMode: "codex",
    });
    expect(parseArgs(["--help"]).command).toBe("help");
  });

  test("rejects invalid input clearly", () => {
    expect(() => parseArgs(["wat"])).toThrow("unknown_command:wat");
    expect(() => parseArgs(["bridge", "--wat"])).toThrow("unknown_option:--wat");
    expect(() => parseArgs(["bridge", "--port"])).toThrow("missing_value:--port");
  });
});

describe("bridge cli scalar parsing", () => {
  test("validates ports", () => {
    expect(parsePort("42420")).toBe(42420);
    expect(() => parsePort("0")).toThrow("invalid_port:0");
    expect(() => parsePort("70000")).toThrow("invalid_port:70000");
  });

  test("validates bridge modes", () => {
    expect(parseBridgeMode("codex")).toBe("codex");
    expect(parseBridgeMode("demo")).toBe("demo");
    expect(() => parseBridgeMode("desktop")).toThrow("invalid_mode:desktop");
  });
});
