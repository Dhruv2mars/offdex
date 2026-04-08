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

export function usage() {
  return [
    "Offdex CLI",
    "",
    "Usage:",
    "  offdex",
    "  offdex start [options]",
    "  offdex status [options]",
    "  offdex stop [options]",
    "  offdex --help",
    "",
    "Commands:",
    "  start                         Start the Mac bridge and show the pairing QR",
    "  status                        Check the local bridge",
    "  stop                          Stop the local bridge started by Offdex",
    "",
    "Options:",
    "  --host <host>                 Bridge host. Default: 0.0.0.0",
    "  --port <port>                 Bridge port. Default: 42420",
    "  --mode <codex|demo>           Bridge runtime mode. Default: codex",
    "  --control-plane-url <url>     Managed remote control plane URL",
    "  -h, --help                    Show help",
    "",
    "Environment fallbacks:",
    "  OFFDEX_BRIDGE_HOST",
    "  OFFDEX_BRIDGE_PORT",
    "  OFFDEX_BRIDGE_MODE",
    "  OFFDEX_CONTROL_PLANE_URL",
  ].join("\n");
}

export function onboarding() {
  return [
    "Offdex",
    "Codex from your phone.",
    "",
    "Get started:",
    "  1. Run offdex start",
    "  2. Open Offdex on your phone",
    "  3. Scan the QR from this terminal",
    "",
    "Useful commands:",
    "  offdex start      Start the Mac bridge",
    "  offdex status     Check if Offdex is running",
    "  offdex stop       Stop the local bridge",
    "  offdex --help     Show all options",
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
