import { describe, expect, test } from "bun:test";
import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  onboarding,
  parseArgs,
  parseBridgeMode,
  parsePort,
  usage,
} from "../src/cli-lib";

describe("bridge cli parser", () => {
  test("shows onboarding when no command is provided", () => {
    expect(parseArgs([])).toEqual({
      command: "onboarding",
      host: DEFAULT_HOST,
      port: DEFAULT_PORT,
      bridgeMode: "codex",
      controlPlaneUrl: undefined,
    });
  });

  test("uses defaults for the start command", () => {
    expect(parseArgs(["start"])).toEqual({
      command: "start",
      host: DEFAULT_HOST,
      port: DEFAULT_PORT,
      bridgeMode: "codex",
      controlPlaneUrl: undefined,
      deprecatedBridgeAlias: false,
    });
  });

  test("keeps bridge as a deprecated start alias", () => {
    expect(parseArgs(["bridge"]).command).toBe("start");
    expect(parseArgs(["bridge"]).deprecatedBridgeAlias).toBe(true);
  });

  test("parses explicit start options", () => {
    expect(
      parseArgs([
        "start",
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
      command: "start",
      host: "127.0.0.1",
      port: 5555,
      bridgeMode: "demo",
      controlPlaneUrl: "https://control.offdex.app",
      deprecatedBridgeAlias: false,
    });
  });

  test("falls back to environment values", () => {
    expect(
      parseArgs(["start"], {
        OFFDEX_BRIDGE_HOST: "0.0.0.0",
        OFFDEX_BRIDGE_PORT: "4444",
        OFFDEX_BRIDGE_MODE: "demo",
        OFFDEX_CONTROL_PLANE_URL: "https://control.example.com",
      } as NodeJS.ProcessEnv)
    ).toEqual({
      command: "start",
      host: "0.0.0.0",
      port: 4444,
      bridgeMode: "demo",
      controlPlaneUrl: "https://control.example.com",
      deprecatedBridgeAlias: false,
    });
  });

  test("parses status and stop commands", () => {
    expect(parseArgs(["status"])).toEqual({
      command: "status",
      host: DEFAULT_HOST,
      port: DEFAULT_PORT,
      bridgeMode: "codex",
      controlPlaneUrl: undefined,
    });
    expect(parseArgs(["stop", "--port", "5555"]).command).toBe("stop");
    expect(parseArgs(["stop", "--port", "5555"]).port).toBe(5555);
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
    expect(() => parseArgs(["start", "--wat"])).toThrow("unknown_option:--wat");
    expect(() => parseArgs(["start", "--port"])).toThrow("missing_value:--port");
  });
});

describe("bridge cli copy", () => {
  test("onboarding is not the help screen", () => {
    expect(onboarding()).toContain("Run offdex start");
    expect(onboarding()).toContain("Scan the QR");
    expect(onboarding()).not.toContain("Usage:");
  });

  test("usage points users at start instead of bridge", () => {
    expect(usage()).toContain("offdex start");
    expect(usage()).toContain("offdex status");
    expect(usage()).toContain("offdex stop");
    expect(usage()).not.toContain("offdex bridge [options]");
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
