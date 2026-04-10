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
export const OFFDEX_CONTROL_PLANE_URL =
  "https://offdex-control-plane.dhruv-sharma10102005.workers.dev";

function shouldColor() {
  return Boolean(process.stdout.isTTY) &&
    process.env.NO_COLOR !== "1" &&
    process.env.NO_COLOR !== "true" &&
    process.env.TERM !== "dumb";
}

function paint(code: string, text: string) {
  return shouldColor() ? `\u001b[${code}m${text}\u001b[0m` : text;
}

function developBlue(text: string) {
  return paint("38;2;10;114;239", text);
}

function previewPink(text: string) {
  return paint("38;2;222;29;141", text);
}

function shipRed(text: string) {
  return paint("38;2;255;91;79", text);
}

function muted(text: string) {
  return paint("38;2;136;136;136", text);
}

function white(text: string) {
  return paint("38;2;255;255;255", text);
}

function bold(text: string) {
  return paint("1", text);
}

function bgBlue(text: string) {
  return paint("48;2;10;114;239;38;2;255;255;255;1", ` ${text} `);
}

function bgRed(text: string) {
  return paint("48;2;255;91;79;38;2;255;255;255;1", ` ${text} `);
}

const S_STEP = developBlue("◆");
const S_BAR = muted("│");
const S_END = muted("└");
const S_ERR = shipRed("▲");

function mascotBanner() {
  return [
    "      \x1b[38;2;64;64;64m▄\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m▄\x1b[0m      ",
    "    \x1b[38;2;64;64;64m▄\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m\x1b[48;2;255;255;255m▀\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m▄\x1b[0m    ",
    "   \x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;255;255;255m█\x1b[0m\x1b[38;2;255;255;255m█\x1b[0m\x1b[38;2;255;255;255m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m\x1b[48;2;255;255;255m▀\x1b[0m\x1b[38;2;64;64;64m\x1b[48;2;255;255;255m▀\x1b[0m\x1b[38;2;255;255;255m\x1b[48;2;64;64;64m▀\x1b[0m\x1b[38;2;255;255;255m\x1b[48;2;64;64;64m▀\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m   ",
    "   \x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;255;255;255m\x1b[48;2;64;64;64m▀\x1b[0m\x1b[38;2;255;255;255m\x1b[48;2;64;64;64m▀\x1b[0m\x1b[38;2;255;255;255m\x1b[48;2;64;64;64m▀\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;255;255;255m\x1b[48;2;64;64;64m▀\x1b[0m\x1b[38;2;255;255;255m\x1b[48;2;64;64;64m▀\x1b[0m\x1b[38;2;64;64;64m\x1b[48;2;255;255;255m▀\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m   ",
    "   \x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m   ",
    "   \x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m          \x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m\x1b[38;2;64;64;64m█\x1b[0m   ",
    ""
  ].join("\n");
}

function title(text: string) {
  return `${S_STEP} ${bold(text)}`;
}

function alertTitle(text: string) {
  return `${S_ERR} ${bold(text)}`;
}

function section(text: string) {
  return `${S_BAR}\n${developBlue("◇")} ${bold(text)}`;
}

function row(label: string, value: string) {
  return `${S_BAR} ${muted(label.padEnd(8))} ${white(value)}`;
}

function commandRow(commandText: string, description: string) {
  return `${S_BAR} ${developBlue(commandText.padEnd(28))} ${muted(description)}`;
}

function optionRow(option: string, description: string) {
  if (!description) {
    return `${S_BAR}   ${developBlue(option)}`;
  }
  return `${S_BAR}   ${developBlue(option.padEnd(34))} ${muted(description)}`;
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
    mascotBanner(),
    `${S_STEP} ${bgBlue("OFFDEX HELP")}`,
    `${S_BAR} Use Codex from your phone.`,
    section("Commands"),
    commandRow("offdex", "Open the Offdex home screen."),
    commandRow("offdex help", "Show commands, docs, and support links."),
    commandRow("offdex start [options]", "Start the bridge and show the pairing QR."),
    commandRow("offdex status [options]", "Show bridge, Codex, client, and remote status."),
    commandRow("offdex stop [options]", "Stop the local bridge started by Offdex."),
    section("Start options"),
    optionRow("--host <host>", "Default: 0.0.0.0"),
    optionRow("--port <port>", "Default: 42420"),
    optionRow("--mode <codex|demo>", "Default: codex"),
    optionRow("--control-plane-url <url>", "Override managed remote pairing."),
    section("Environment fallbacks"),
    optionRow("OFFDEX_BRIDGE_HOST", ""),
    optionRow("OFFDEX_BRIDGE_PORT", ""),
    optionRow("OFFDEX_BRIDGE_MODE", ""),
    optionRow("OFFDEX_CONTROL_PLANE_URL", `Default: ${OFFDEX_CONTROL_PLANE_URL}`),
    `${S_BAR}`,
    `${S_BAR} Docs:     ${previewPink(OFFDEX_WEB_URL)}`,
    `${S_BAR} GitHub:   ${previewPink(OFFDEX_GITHUB_URL)}`,
    `${S_END} Feedback: ${previewPink(OFFDEX_ISSUES_URL)}`,
  ].join("\n");
}

export function onboarding() {
  return [
    mascotBanner(),
    `${S_STEP} ${bgBlue("OFFDEX")}`,
    `${S_BAR} Use Codex from your phone.`,
    section("Get started"),
    `${S_BAR} ${muted("1.")} ${developBlue("offdex start")}        Start the bridge on this Mac.`,
    `${S_BAR} ${muted("2.")} Open Offdex on your phone.`,
    `${S_BAR} ${muted("3.")} Scan the QR from this terminal.`,
    `${S_BAR} ${muted("4.")} Send a prompt and watch Codex reply live.`,
    section("Core commands"),
    commandRow("offdex help", "Commands, docs, GitHub, feedback."),
    commandRow("offdex start", "Start the bridge and show the QR."),
    commandRow("offdex status", "Show bridge, Codex, and client status."),
    commandRow("offdex stop", "Stop the local bridge."),
    `${S_BAR}`,
    `${S_END} Docs: ${previewPink(OFFDEX_WEB_URL)}`,
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
    ? `connected${input.health.relayUrl ? ` via ${input.health.relayUrl}` : ""}`
    : "local network only";

  return [
    `${S_STEP} ${bgBlue("OFFDEX IS RUNNING")}`,
    row("Bridge", previewPink(input.baseUrl)),
    input.health.macName ? row("Machine", input.health.macName) : null,
    row("Runtime", input.health.bridgeMode ?? "codex"),
    row("Codex", codexLine.replace(/^Codex: /, "")),
    row("Clients", `${clientCount} live`),
    row("Remote", remoteLine),
    input.state?.startedAt ? row("Started", input.state.startedAt) : null,
    `${S_END}`
  ].filter(Boolean).join("\n");
}

export function formatOfflineStatus() {
  return [
    `${S_ERR} ${bgRed("OFFDEX IS NOT RUNNING")}`,
    row("Next", developBlue("offdex start")),
    `${S_END}`
  ].join("\n");
}

export function formatStoppedStatus(baseUrl: string) {
  return [
    `${S_STEP} ${bgBlue("OFFDEX STOPPED")}`,
    row("Bridge", previewPink(baseUrl)),
    `${S_END}`
  ].join("\n");
}

export function formatStaleStatus() {
  return [
    `${S_ERR} ${bgRed("OFFDEX WAS NOT RUNNING")}`,
    row("State", "removed stale local state"),
    `${S_END}`
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
    controlPlaneUrl: env.OFFDEX_CONTROL_PLANE_URL || OFFDEX_CONTROL_PLANE_URL,
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
