export type BridgeMode = "demo" | "codex";

export type CliCommand = "onboarding" | "start" | "status" | "stop" | "help";

export type CliOptions = {
  command: CliCommand;
  host: string;
  port: number;
  bridgeMode: BridgeMode;
  controlPlaneUrl?: string;
  deprecatedBridgeAlias?: boolean;
};

export const DEFAULT_PORT = 42420;
export const DEFAULT_HOST = "0.0.0.0";
export const OFFDEX_WEB_URL = "https://offdexapp.vercel.app";
export const OFFDEX_GITHUB_URL = "https://github.com/Dhruv2mars/offdex";
export const OFFDEX_ISSUES_URL = `${OFFDEX_GITHUB_URL}/issues`;
const OPENAI_GREEN = "38;2;16;163;127";
const OPENAI_MINT = "38;2;203;255;229";
const OPENAI_MUTED = "38;2;156;163;160";
const OPENAI_TEXT = "38;2;225;229;226";

function shouldColor() {
  return Boolean(process.stdout.isTTY) &&
    process.env.NO_COLOR !== "1" &&
    process.env.NO_COLOR !== "true" &&
    process.env.TERM !== "dumb";
}

function paint(code: string, text: string) {
  return shouldColor() ? `\u001b[${code}m${text}\u001b[0m` : text;
}

function green(text: string) {
  return paint(OPENAI_GREEN, text);
}

function mint(text: string) {
  return paint(OPENAI_MINT, text);
}

function muted(text: string) {
  return paint(OPENAI_MUTED, text);
}

function bright(text: string) {
  return paint(OPENAI_TEXT, text);
}

function bold(text: string) {
  return paint("1", text);
}

export type BridgeRunStateView = {
  pid: number;
  host: string;
  port: number;
  startedAt: string;
};

export type BridgeHealthView = {
  macName?: string;
  bridgeMode?: string;
  codexConnected?: boolean;
  codexAccount?: {
    email?: string | null;
    plan?: string | null;
  } | null;
  liveClientCount?: number;
  relayConnected?: boolean;
  relayUrl?: string | null;
};

export type DaemonLaunchPlan = {
  command: string;
  args: string[];
};

export function createDaemonLaunchPlan(input: {
  argv: string[];
  execPath: string;
}): DaemonLaunchPlan {
  const entry = input.argv[1] ?? "";
  const runsThroughScript = /\.(?:[cm]?[jt]s|tsx|jsx)$/.test(entry);
  const runsFromBunFs = entry.startsWith("/$bunfs/");

  if (runsThroughScript) {
    return {
      command: input.execPath,
      args: [entry, ...input.argv.slice(2)],
    };
  }

  if (runsFromBunFs) {
    return {
      command: input.execPath,
      args: input.argv.slice(2),
    };
  }

  return {
    command: input.argv[0] || input.execPath,
    args: input.argv.slice(1),
  };
}

export function usage() {
  return [
    bold(green("Offdex help")),
    muted("Codex mobile app."),
    "",
    green("Commands"),
    `  ${bright("offdex")}`,
    "      Open the Offdex home screen.",
    "",
    `  ${bright("offdex help")}`,
    "      Show commands, docs, and support links.",
    "",
    `  ${bright("offdex start")} ${muted("[options]")}`,
    "      Start the bridge and show the pairing QR.",
    "",
    `  ${bright("offdex status")} ${muted("[options]")}`,
    "      Show bridge, Codex, client, and remote status.",
    "",
    `  ${bright("offdex stop")} ${muted("[options]")}`,
    "      Stop the local bridge started by Offdex.",
    "",
    green("Start options"),
    `  ${bright("--host <host>")}                 Default: 0.0.0.0`,
    `  ${bright("--port <port>")}                 Default: 42420`,
    `  ${bright("--mode <codex|demo>")}           Default: codex`,
    `  ${bright("--control-plane-url <url>")}     Enable managed remote pairing.`,
    "",
    green("Environment fallbacks"),
    `  ${bright("OFFDEX_BRIDGE_HOST")}`,
    `  ${bright("OFFDEX_BRIDGE_PORT")}`,
    `  ${bright("OFFDEX_BRIDGE_MODE")}`,
    `  ${bright("OFFDEX_CONTROL_PLANE_URL")}`,
    "",
    green("Links"),
    `  Docs:     ${mint(OFFDEX_WEB_URL)}`,
    `  GitHub:   ${mint(OFFDEX_GITHUB_URL)}`,
    `  Feedback: ${mint(OFFDEX_ISSUES_URL)}`,
  ].join("\n");
}

export function onboarding() {
  return [
    bold(green("Offdex")),
    muted("Codex mobile app."),
    "",
    "Use Codex from your phone while the real Codex session keeps running on this Mac.",
    "",
    green("Get started"),
    `  1. Run ${bright("offdex start")}`,
    "  2. Open Offdex on your phone.",
    "  3. Scan the QR from this terminal.",
    "  4. Send a prompt and watch Codex reply live.",
    "",
    green("Core commands"),
    `  ${bright("offdex help")}       Commands, docs, GitHub, feedback.`,
    `  ${bright("offdex start")}      Start the bridge and show the QR.`,
    `  ${bright("offdex status")}     Show bridge, Codex, and client status.`,
    `  ${bright("offdex stop")}       Stop the local bridge.`,
    "",
    `Docs: ${mint(OFFDEX_WEB_URL)}`,
  ].join("\n");
}

export function formatBridgeStatus(input: {
  baseUrl: string;
  state: BridgeRunStateView | null;
  health: BridgeHealthView;
}) {
  const account = input.health.codexAccount;
  const codexLine =
    input.health.bridgeMode === "demo"
      ? "Codex: demo mode"
      : input.health.codexConnected
        ? `Codex: signed in${account?.email ? ` as ${account.email}` : ""}${account?.plan ? ` (${account.plan})` : ""}`
        : "Codex: sign in on this Mac";
  const clientCount = input.health.liveClientCount ?? 0;
  const remoteLine = input.health.relayConnected
    ? `Remote: connected${input.health.relayUrl ? ` via ${input.health.relayUrl}` : ""}`
    : "Remote: local network only";

  return [
    bold(green("Offdex is running")),
    `${muted("Bridge:")} ${mint(input.baseUrl)}`,
    input.health.macName ? `${muted("Machine:")} ${input.health.macName}` : null,
    `${muted("Runtime:")} ${input.health.bridgeMode ?? "codex"}`,
    codexLine,
    `${muted("Clients:")} ${clientCount} live`,
    remoteLine,
    input.state?.startedAt ? `${muted("Started:")} ${input.state.startedAt}` : null,
  ].filter(Boolean).join("\n");
}

export function formatOfflineStatus() {
  return [
    bold("Offdex is not running"),
    `Start it with: ${bright("offdex start")}`,
  ].join("\n");
}

export function parsePort(value: string) {
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`invalid_port:${value}`);
  }
  return port;
}

export function parseBridgeMode(value: string): BridgeMode {
  if (value === "codex" || value === "demo") {
    return value;
  }
  throw new Error(`invalid_mode:${value}`);
}

export function parseArgs(
  argv = process.argv.slice(2),
  env = process.env
): CliOptions {
  const args = [...argv];
  const firstArg = args[0];

  if (!firstArg) {
    return {
      command: "onboarding",
      host: DEFAULT_HOST,
      port: DEFAULT_PORT,
      bridgeMode: "codex",
      controlPlaneUrl: undefined,
    };
  }

  let command: CliCommand = "start";
  let deprecatedBridgeAlias = false;
  if (firstArg === "start" || firstArg === "bridge") {
    deprecatedBridgeAlias = firstArg === "bridge";
    args.shift();
  } else if (firstArg === "status" || firstArg === "stop") {
    command = firstArg;
    args.shift();
  } else if (firstArg === "help" || firstArg === "--help" || firstArg === "-h") {
    return {
      command: "help",
      host: DEFAULT_HOST,
      port: DEFAULT_PORT,
      bridgeMode: "codex",
    };
  } else {
    throw new Error(`unknown_command:${firstArg}`);
  }

  const options: CliOptions = {
    command,
    host: env.OFFDEX_BRIDGE_HOST || DEFAULT_HOST,
    port: parsePort(env.OFFDEX_BRIDGE_PORT || String(DEFAULT_PORT)),
    bridgeMode: parseBridgeMode(env.OFFDEX_BRIDGE_MODE || "codex"),
    controlPlaneUrl: env.OFFDEX_CONTROL_PLANE_URL || undefined,
    ...(command === "start" ? { deprecatedBridgeAlias } : {}),
  };

  while (args.length > 0) {
    const arg = args.shift();
    if (!arg) {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.command = "help";
      continue;
    }

    if (arg === "--host") {
      const value = args.shift();
      if (!value) throw new Error("missing_value:--host");
      options.host = value;
      continue;
    }

    if (arg === "--port") {
      const value = args.shift();
      if (!value) throw new Error("missing_value:--port");
      options.port = parsePort(value);
      continue;
    }

    if (arg === "--mode") {
      const value = args.shift();
      if (!value) throw new Error("missing_value:--mode");
      options.bridgeMode = parseBridgeMode(value);
      continue;
    }

    if (arg === "--control-plane-url") {
      const value = args.shift();
      if (!value) throw new Error("missing_value:--control-plane-url");
      options.controlPlaneUrl = value;
      continue;
    }

    throw new Error(`unknown_option:${arg}`);
  }

  return options;
}
