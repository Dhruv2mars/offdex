import { describe, expect, test } from "bun:test";
import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  OFFDEX_CONTROL_PLANE_URL,
  createDaemonLaunchPlan,
  formatBridgeStatus,
  formatOfflineStatus,
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
      controlPlaneUrl: OFFDEX_CONTROL_PLANE_URL,
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
      controlPlaneUrl: OFFDEX_CONTROL_PLANE_URL,
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

describe("bridge cli daemon launcher", () => {
  test("relaunches through Bun when running from source", () => {
    expect(
      createDaemonLaunchPlan({
        argv: ["/opt/homebrew/bin/bun", "/repo/packages/bridge/src/cli.ts", "start", "--port", "42420"],
        execPath: "/opt/homebrew/bin/bun",
      })
    ).toEqual({
      command: "/opt/homebrew/bin/bun",
      args: ["/repo/packages/bridge/src/cli.ts", "start", "--port", "42420"],
    });
  });

  test("relaunches the compiled binary directly", () => {
    expect(
      createDaemonLaunchPlan({
        argv: ["/Users/me/.offdex/bin/offdex", "start", "--port", "42420"],
        execPath: "/opt/homebrew/bin/bun",
      })
    ).toEqual({
      command: "/Users/me/.offdex/bin/offdex",
      args: ["start", "--port", "42420"],
    });
  });

  test("drops Bun's virtual compiled entry when relaunching the binary", () => {
    expect(
      createDaemonLaunchPlan({
        argv: ["bun", "/$bunfs/root/offdex", "start", "--port", "42420"],
        execPath: "/Users/me/.offdex/bin/offdex",
      })
    ).toEqual({
      command: "/Users/me/.offdex/bin/offdex",
      args: ["start", "--port", "42420"],
    });
  });
});

describe("bridge cli copy", () => {
  const expectedMascotGrid = [
    "........................",
    "........................",
    "........................",
    "........................",
    "........#######.........",
    "......###########.......",
    ".....#############......",
    "....###############.....",
    "...#################....",
    "...############..###....",
    "..#####...###..######...",
    "..#####...###..######...",
    "..######.#####..#####...",
    "..###################...",
    "..###################...",
    "..###################...",
    "..#####.........#####...",
    "..#####.........#####...",
    "..#####.........#####...",
    "..#####.........#####...",
    "........................",
    "........................",
    "........................",
    "........................",
  ];

  function gridFromMascotLines(lines: string[]) {
    return lines.map((line) => {
      expect(line.length).toBe(48);
      return line.match(/.{2}/g)?.map((cell) => (cell === "██" ? "#" : ".")).join("");
    });
  }

  test("renders the mascot as a 24 by 24 grid silhouette", () => {
    expect(gridFromMascotLines(onboarding().split("\n").slice(0, 24))).toEqual(expectedMascotGrid);
    expect(gridFromMascotLines(usage().split("\n").slice(0, 24))).toEqual(expectedMascotGrid);
  });

  test("onboarding is a polished static home screen, not the help screen", () => {
    expect(onboarding()).toContain("OFFDEX");
    expect(onboarding()).toContain("Use Codex from your phone");
    expect(onboarding()).toContain("1. offdex start");
    expect(onboarding()).toContain("Get started");
    expect(onboarding()).toContain("offdex start");
    expect(onboarding()).toContain("Scan the QR");
    expect(onboarding()).toContain("offdex status");
    expect(onboarding()).not.toContain("Usage:");
  });

  test("usage exposes the five public commands and project links", () => {
    expect(usage()).toContain("OFFDEX HELP");
    expect(usage()).toContain("Use Codex from your phone");
    expect(usage()).toContain("Commands");
    expect(usage()).toContain("offdex start [options]");
    expect(usage()).toContain("Start options");
    expect(usage()).toContain("offdex");
    expect(usage()).toContain("offdex help");
    expect(usage()).toContain("offdex start");
    expect(usage()).toContain("offdex status");
    expect(usage()).toContain("offdex stop");
    expect(usage()).toContain("https://offdexapp.vercel.app");
    expect(usage()).toContain("https://github.com/Dhruv2mars/offdex/issues");
    expect(usage()).not.toContain("offdex bridge [options]");
  });

  test("status output reports runtime, codex, clients, and remote state", () => {
    expect(
      formatBridgeStatus({
        baseUrl: "http://127.0.0.1:42420",
        state: { pid: 123, host: "0.0.0.0", port: 42420, startedAt: "2026-04-08T00:00:00.000Z" },
        health: {
          macName: "Studio Mac",
          bridgeMode: "codex",
          codexConnected: true,
          codexAccount: { email: "user@example.com", plan: "Plus" },
          liveClientCount: 2,
          relayConnected: true,
        },
      })
    ).toContain("Clients  2 live");
    expect(
      formatBridgeStatus({
        baseUrl: "http://127.0.0.1:42420",
        state: null,
        health: {
          bridgeMode: "demo",
          codexConnected: false,
          liveClientCount: 0,
          relayConnected: false,
        },
      })
    ).toContain("Codex    demo mode");
  });

  test("offline status gives the next command", () => {
    expect(formatOfflineStatus()).toContain("OFFDEX IS NOT RUNNING");
    expect(formatOfflineStatus()).toContain("offdex start");
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
