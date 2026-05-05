import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { hostname, networkInterfaces } from "node:os";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { ServerWebSocket } from "bun";
import QRCode from "qrcode";
import {
  createRelayAuthToken,
  decryptRelayPayload,
  encryptRelayPayload,
  type OffdexAccountLoginSession,
  type OffdexAutomationRecord,
  type OffdexConfigSummary,
  type OffdexInputItem,
  type OffdexPluginRecord,
  type OffdexRemoteFileEntry,
  type OffdexRemoteFileMatch,
  type OffdexRemoteDiff,
  type OffdexRuntimeAccount,
  type OffdexSkillRecord,
  type OffdexWorkbenchInventory,
  type OffdexPairingProfile,
  WorkspaceSnapshotStore,
  encodePairingUri,
  makeDemoWorkspaceSnapshot,
  makeMessage,
  type RuntimeTarget,
  verifyBridgeAccessToken,
} from "@offdex/protocol";
import {
  CodexBridgeRuntime,
  NEW_THREAD_ID,
  applyCodexNotification,
  buildCodexExecutableCandidates,
  createCodexSnapshot,
  findActiveTurnId,
  mapCodexThreadToOffdexThread,
  parseCodexAccountSummary,
  resolveCodexExecutable,
} from "./codex-app-server";

export {
  CodexAppServerClient,
  CodexBridgeRuntime,
  NEW_THREAD_ID,
  applyCodexNotification,
  buildCodexExecutableCandidates,
  createCodexSnapshot,
  findActiveTurnId,
  mapCodexThreadToOffdexThread,
  parseCodexAccountSummary,
  resolveCodexExecutable,
} from "./codex-app-server";

export interface RuntimeResolutionInput {
  hostPlatform: "darwin" | "linux" | "win32";
  preferredTarget: RuntimeTarget;
  desktopAvailable: boolean;
}

export interface RuntimeResolution {
  target: RuntimeTarget;
  reason: string;
}

export interface BridgeSession {
  pairingCode: string;
  runtimeTarget: RuntimeTarget;
  connectedAt: string;
}

export interface BridgeTurnInput {
  threadId: string;
  body: string;
  inputs?: OffdexInputItem[];
}

export type BridgeMode = "demo" | "codex";

export function resolveRuntimeTarget(input: RuntimeResolutionInput): RuntimeResolution {
  if (input.preferredTarget === "desktop" && input.desktopAvailable && input.hostPlatform === "darwin") {
    return {
      target: "desktop",
      reason: "Desktop runtime adapter available on this Mac.",
    };
  }

  if (input.preferredTarget === "desktop") {
    return {
      target: "cli",
      reason: "Desktop runtime adapter is not wired yet. Falling back to Codex CLI.",
    };
  }

  return {
    target: "cli",
    reason: "Codex CLI selected.",
  };
}

export function createBridgeSession(pairingCode: string, runtimeTarget: RuntimeTarget): BridgeSession {
  return {
    pairingCode,
    runtimeTarget,
    connectedAt: new Date().toISOString(),
  };
}

export class BridgeSessionStore {
  #activeSession: BridgeSession | null = null;

  connect(session: BridgeSession) {
    this.#activeSession = session;
  }

  disconnect() {
    this.#activeSession = null;
  }

  getActiveSession() {
    return this.#activeSession;
  }
}

export interface BridgeServerOptions {
  host?: string;
  port?: number;
  desktopAvailable?: boolean;
  bridgeMode?: BridgeMode;
  relayUrl?: string;
  controlPlaneUrl?: string;
  bridgeStateStore?: BridgeStateStore;
}

export interface BridgePairingPayload {
  bridgeUrl: string;
  bridgeHints: string[];
  macName: string;
  pairingUri: string;
}

export interface BridgePersistentState {
  bridgeId: string;
  bridgeSecret: string;
  relayRoomId: string;
  relayUrl: string | null;
  createdAt: string;
}

export interface BridgeStateStore {
  loadOrCreate(input: {
    relayUrl: string | null;
    macName: string;
  }): BridgePersistentState;
}

type BridgeAddressRecord = {
  address: string;
  family: string | number;
  internal: boolean;
};

type RelayBridgeRequest =
  | { id: string; action: "health" }
  | { id: string; action: "snapshot" }
  | { id: string; action: "inventory" }
  | { id: string; action: "account/login/start"; type?: "chatgpt" }
  | { id: string; action: "account/login/cancel"; loginId: string }
  | { id: string; action: "account/logout" }
  | { id: string; action: "config/write"; keyPath: string; value: unknown; filePath?: string | null }
  | { id: string; action: "config/batchWrite"; edits: Array<{ keyPath: string; value: unknown }>; filePath?: string | null }
  | { id: string; action: "experimental-feature/set"; name: string; enabled: boolean }
  | { id: string; action: "skills/config/write"; name?: string | null; path?: string | null; enabled: boolean }
  | { id: string; action: "plugin/install"; marketplacePath: string; pluginName: string }
  | { id: string; action: "plugin/uninstall"; pluginId: string }
  | { id: string; action: "git/diff-remote"; cwd?: string | null }
  | { id: string; action: "files/list"; path: string }
  | { id: string; action: "files/search"; query: string; roots: string[] }
  | { id: string; action: "runtime"; preferredTarget: RuntimeTarget }
  | { id: string; action: "turn"; threadId: string; body: string; inputs?: OffdexInputItem[] }
  | { id: string; action: "turn/steer"; threadId: string; body: string; inputs?: OffdexInputItem[] }
  | { id: string; action: "interrupt"; threadId: string }
  | { id: string; action: "thread/rename"; threadId: string; name: string }
  | { id: string; action: "thread/fork"; threadId: string }
  | { id: string; action: "thread/archive"; threadId: string }
  | { id: string; action: "thread/unarchive"; threadId: string }
  | { id: string; action: "thread/compact"; threadId: string }
  | { id: string; action: "thread/rollback"; threadId: string; numTurns: number }
  | { id: string; action: "review/start"; threadId: string }
  | { id: string; action: "mcp/oauth/login"; name: string }
  | {
      id: string;
      action: "approval";
      approvalId: string;
      approve: boolean;
      answers?: Record<string, string>;
    };

function shouldColorTerminal() {
  return Boolean(process.stdout.isTTY) &&
    process.env.NO_COLOR !== "1" &&
    process.env.NO_COLOR !== "true" &&
    process.env.TERM !== "dumb";
}

function paintTerminal(code: string, text: string) {
  return shouldColorTerminal() ? `\u001b[${code}m${text}\u001b[0m` : text;
}

function developBlue(text: string) {
  return paintTerminal("38;2;10;114;239", text);
}

function successGreen(text: string) {
  return paintTerminal("38;2;39;201;63", text);
}

function shipRed(text: string) {
  return paintTerminal("38;2;255;91;79", text);
}

function muted(text: string) {
  return paintTerminal("38;2;136;136;136", text);
}

function white(text: string) {
  return paintTerminal("38;2;255;255;255", text);
}

function terminalBold(text: string) {
  return paintTerminal("1", text);
}

function terminalUnderline(text: string) {
  return paintTerminal("4", text);
}

const S_STEP = terminalBold("◆");
const S_BAR = muted("│");
const S_END = muted("└");

function terminalTitle(text: string) {
  return `${S_STEP} ${terminalBold(white(text.toUpperCase()))}`;
}

function terminalSection(text: string) {
  return `${S_BAR}\n${muted("◇")} ${terminalBold(white(text))}`;
}

function terminalRow(label: string, value: string) {
  return `${S_BAR} ${muted(label.padEnd(8))} ${white(value)}`;
}

export function createBridgeWebUiUrl(
  bridgeUrl: string,
  webAppUrl = process.env.OFFDEX_WEB_UI_URL ?? "https://offdexapp.vercel.app/webui",
  pairingUri?: string
) {
  const url = new URL(webAppUrl);
  url.searchParams.set("bridge", bridgeUrl);
  if (pairingUri) {
    url.searchParams.set("pair", pairingUri);
  }
  return url.toString();
}

export function buildBridgeHints(
  port: number,
  readNetworkInterfaces: () => Record<string, BridgeAddressRecord[] | undefined> = networkInterfaces,
  readHostname: typeof hostname = hostname,
  boundHost = "0.0.0.0"
) {
  const urls = new Set<string>();
  const host = boundHost.trim();

  if (host && host !== "0.0.0.0" && host !== "::") {
    urls.add(`http://${host.includes(":") && !host.startsWith("[") ? `[${host}]` : host}:${port}`);
    if (host === "localhost" || host === "::1" || host.startsWith("127.")) {
      urls.add(`http://127.0.0.1:${port}`);
      urls.add(`http://localhost:${port}`);
    }
    return [...urls];
  }

  const interfaces = readNetworkInterfaces();

  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family !== "IPv4" || address.internal) {
        continue;
      }

      urls.add(`http://${address.address}:${port}`);
    }
  }

  const localHostname = readHostname().trim();
  if (localHostname && localHostname !== "localhost") {
    const mdnsHostname = localHostname.endsWith(".local")
      ? localHostname
      : `${localHostname}.local`;
    urls.add(`http://${mdnsHostname}:${port}`);
  }

  urls.add(`http://127.0.0.1:${port}`);
  urls.add(`http://localhost:${port}`);
  return [...urls];
}

export function createBridgeWorkspaceStore(
  runtimeTarget: RuntimeTarget = "cli",
  pairingProfile: Partial<OffdexPairingProfile> = {}
) {
  return new WorkspaceSnapshotStore(makeDemoWorkspaceSnapshot(runtimeTarget, pairingProfile));
}

export function createBridgePairingPayload(
  pairingProfile: OffdexPairingProfile,
  bridgeState?: BridgePersistentState,
  remoteBootstrap?: {
    controlPlaneUrl: string;
    machineId: string;
    claimCode: string;
    ownerLabel: string;
  } | null
): BridgePairingPayload {
  return {
    bridgeUrl: pairingProfile.bridgeUrl,
    bridgeHints: pairingProfile.bridgeHints,
    macName: pairingProfile.macName,
    pairingUri: encodePairingUri({
      bridgeUrl: pairingProfile.bridgeUrl,
      macName: pairingProfile.macName,
      relay:
        bridgeState?.relayUrl
          ? {
              relayUrl: bridgeState.relayUrl,
              roomId: bridgeState.relayRoomId,
              secret: bridgeState.bridgeSecret,
            }
          : undefined,
      remote:
        remoteBootstrap && !bridgeState?.relayUrl
          ? {
              controlPlaneUrl: remoteBootstrap.controlPlaneUrl,
              machineId: remoteBootstrap.machineId,
              claimCode: remoteBootstrap.claimCode,
              ownerLabel: remoteBootstrap.ownerLabel,
            }
          : undefined,
    }),
  };
}

function defaultBridgeStatePath() {
  return join(homedir(), ".offdex", "bridge-state.json");
}

function toRelayHostWsUrl(relayUrl: string) {
  const normalized = relayUrl.replace(/\/+$/, "");

  if (normalized.startsWith("https://")) {
    return normalized.replace("https://", "wss://");
  }

  if (normalized.startsWith("http://")) {
    return normalized.replace("http://", "ws://");
  }

  return normalized;
}

function normalizeHttpBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function readBridgeTicket(request: Request) {
  const header = request.headers.get("authorization")?.trim() ?? "";
  if (header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }

  return new URL(request.url).searchParams.get("ticket")?.trim() ?? null;
}

function codexHomePath() {
  return process.env.CODEX_HOME?.trim() || join(homedir(), ".codex");
}

function readDirNames(path: string) {
  try {
    return readdirSync(path, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

function readSkillRecords(path: string, source: OffdexSkillRecord["source"]) {
  return readDirNames(path)
    .filter((name) => existsSync(join(path, name, "SKILL.md")))
    .map<OffdexSkillRecord>((name) => ({
      id: `${source}:${name}`,
      name,
      path: join(path, name, "SKILL.md"),
      source,
    }));
}

function readPluginRecords(path: string, source: OffdexPluginRecord["source"]) {
  return readDirNames(path)
    .filter((name) => name !== "cache" && !name.startsWith("."))
    .map<OffdexPluginRecord>((name) => ({
      id: `${source}:${name}`,
      name,
      path: join(path, name),
      source,
    }));
}

function readAutomationField(contents: string, key: string) {
  const match = contents.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m"));
  return match?.[1]?.trim() || null;
}

function readAutomations(path: string) {
  return readDirNames(path)
    .map<OffdexAutomationRecord | null>((id) => {
      const automationPath = join(path, id, "automation.toml");
      if (!existsSync(automationPath)) {
        return null;
      }

      let contents = "";
      try {
        contents = readFileSync(automationPath, "utf8");
      } catch {
        return null;
      }

      return {
        id,
        name: readAutomationField(contents, "name") || id,
        path: automationPath,
        status: readAutomationField(contents, "status"),
        kind: readAutomationField(contents, "kind"),
        schedule: readAutomationField(contents, "rrule"),
      };
    })
    .filter((record): record is OffdexAutomationRecord => Boolean(record));
}

function readWorkbenchInventory(): OffdexWorkbenchInventory {
  const codeHome = codexHomePath();
  const pluginsPath = join(codeHome, "plugins");
  const agentsSkillsPath = join(homedir(), ".agents", "skills");
  const codexSkillsPath = join(codeHome, "skills");
  const automationsPath = join(codeHome, "automations");

  return {
    codeHome,
    plugins: [
      ...readPluginRecords(pluginsPath, "local"),
    ],
    skills: [
      ...readSkillRecords(agentsSkillsPath, "agents"),
      ...readSkillRecords(codexSkillsPath, "codex"),
    ],
    mcpServers: [],
    automations: readAutomations(automationsPath),
    rateLimits: null,
    experimentalFeatures: [],
  };
}

function createBridgeSecret() {
  return randomBytes(24).toString("base64url");
}

export function createBridgeStateStore(options?: {
  path?: string;
  initialState?: BridgePersistentState | null;
}): BridgeStateStore {
  const path = options?.path;
  let memoryState = options?.initialState ?? null;

  const readState = () => {
    if (memoryState) {
      return memoryState;
    }

    if (!path || !existsSync(path)) {
      return null;
    }

    return JSON.parse(readFileSync(path, "utf8")) as BridgePersistentState;
  };

  const writeState = (state: BridgePersistentState) => {
    memoryState = state;
    if (!path) {
      return;
    }

    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(state, null, 2));
  };

  return {
    loadOrCreate(input) {
      const existing = readState();
      if (existing) {
        const nextState =
          existing.relayUrl === input.relayUrl
            ? existing
            : {
                ...existing,
                relayUrl: input.relayUrl,
              };
        writeState(nextState);
        return nextState;
      }

      const nextState: BridgePersistentState = {
        bridgeId: randomUUID(),
        bridgeSecret: createBridgeSecret(),
        relayRoomId: randomUUID().replaceAll("-", ""),
        relayUrl: input.relayUrl,
        createdAt: new Date().toISOString(),
      };
      writeState(nextState);
      return nextState;
    },
  };
}

export async function createTerminalPairingOutput(pairingUri: string) {
  const qr = await QRCode.toString(pairingUri, {
    type: "utf8",
    margin: 0,
  });

  const indentedQr = qr.split("\n").map(line => `  ${line}`).join("\n");
  return [
    terminalSection("Pair with your phone"),
    `  ${muted("Scan with Offdex")}`,
    "",
    indentedQr,
    ""
  ].join("\n");
}

export async function createBridgeStartupOutput(input: {
  payload: BridgePairingPayload;
  relayUrl: string | null;
}) {
  const qrOutput = await createTerminalPairingOutput(input.payload.pairingUri);
  const lines = [
    terminalTitle("Offdex is running"),
    `${S_BAR} Scan the QR in the mobile app.`,
    terminalRow("Bridge", terminalUnderline(input.payload.bridgeUrl)),
    terminalRow("Web UI", terminalUnderline(createBridgeWebUiUrl(input.payload.bridgeUrl, undefined, input.payload.pairingUri))),
    terminalRow("Remote", input.relayUrl ? successGreen("connected") : "local network only"),
    terminalRow("Manage", "offdex status | offdex stop"),
    "",
    qrOutput.trimEnd(),
    "",
  ];

  return lines.filter(Boolean).join("\n");
}

async function renderPairingPage(payload: BridgePairingPayload) {
  const qrSvg = await QRCode.toString(payload.pairingUri, {
    type: "svg",
    margin: 1,
    width: 240,
    color: {
      dark: "#0b0d0c",
      light: "#f2f6f3",
    },
  });

  const hints = payload.bridgeHints
    .map(
      (hint) =>
        `<li style="margin:0 0 10px;"><code style="font-size:14px;color:#dff5e5;background:#0f1311;padding:6px 8px;border-radius:10px;">${hint}</code></li>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Offdex Pairing</title>
    <style>
      :root { color-scheme: dark; }
      body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif; background:#0b0d0c; color:#eef2ef; }
      main { max-width:960px; margin:0 auto; padding:32px 20px 48px; }
      .eyebrow { color:#d6ff72; letter-spacing:.28em; text-transform:uppercase; font-size:12px; font-weight:800; }
      h1 { font-size:44px; line-height:1; margin:16px 0 14px; letter-spacing:-.05em; }
      p { color:#98a39d; line-height:1.7; font-size:16px; }
      .grid { display:grid; gap:20px; grid-template-columns: minmax(0, 320px) minmax(0, 1fr); margin-top:28px; }
      .card { border:1px solid #1c221f; background:#131715; border-radius:28px; padding:22px; }
      .qr svg { width:100%; height:auto; display:block; border-radius:18px; background:#f2f6f3; padding:18px; box-sizing:border-box; }
      code { word-break:break-all; }
      @media (max-width: 780px) { .grid { grid-template-columns: 1fr; } h1 { font-size:36px; } }
    </style>
  </head>
  <body>
    <main>
      <div class="eyebrow">Offdex Pairing</div>
      <h1>Scan once. Stay local.</h1>
      <p>Use your phone camera or paste the pairing link into Offdex. This page stays local to your Mac and points the app at your bridge.</p>
      <div class="grid">
        <section class="card qr">${qrSvg}</section>
        <section class="card">
          <div class="eyebrow">Pairing link</div>
          <p><code>${payload.pairingUri}</code></p>
          <div class="eyebrow" style="margin-top:20px;">Machine</div>
          <p>${payload.macName}</p>
          <div class="eyebrow" style="margin-top:20px;">Local bridge paths</div>
          <ul style="padding-left:18px;margin:0;">${hints}</ul>
        </section>
      </div>
    </main>
  </body>
</html>`;
}

export function recordBridgeTurn(
  workspaceStore: WorkspaceSnapshotStore,
  input: BridgeTurnInput
) {
  const trimmed = input.body.trim();
  if (!trimmed) {
    return false;
  }

  const snapshot = workspaceStore.getSnapshot();
  const targetThreadId =
    input.threadId === NEW_THREAD_ID || !snapshot.threads.some((entry) => entry.id === input.threadId)
      ? snapshot.threads[0]?.id
      : input.threadId;
  if (!targetThreadId) {
    return false;
  }

  workspaceStore.appendMessage({
    threadId: targetThreadId,
    message: makeMessage(`user-${Date.now()}`, "user", trimmed, "Now"),
    state: "running",
    updatedAt: "Now",
  });

  workspaceStore.appendMessage({
    threadId: targetThreadId,
    message: makeMessage(
      `assistant-${Date.now()}`,
      "assistant",
      "Bridge transport received that turn. Next step: stream the real Codex session into this thread.",
      "Now"
    ),
    state: "running",
    updatedAt: "Now",
  });

  workspaceStore.updatePairingState("paired", "Just now");
  return true;
}

export function startBridgeServer(options: BridgeServerOptions = {}) {
  const host = options.host ?? "0.0.0.0";
  const port = options.port ?? 42420;
  const bridgeMode = options.bridgeMode ?? "demo";
  const controlPlaneUrl = options.controlPlaneUrl ?? process.env.OFFDEX_CONTROL_PLANE_URL ?? null;
  const relayUrl = options.relayUrl ?? process.env.OFFDEX_RELAY_URL ?? null;
  const desktopAvailable =
    options.desktopAvailable ?? Boolean(process.env.OFFDEX_DESKTOP_ENDPOINT);
  const bridgeStateStore =
    options.bridgeStateStore ??
    createBridgeStateStore({
      path: process.env.OFFDEX_BRIDGE_STATE_PATH || defaultBridgeStatePath(),
    });
  const bridgeState = bridgeStateStore.loadOrCreate({
    relayUrl,
    macName: hostname(),
  });
  const workspaceStore = createBridgeWorkspaceStore("cli", {
    bridgeUrl: `http://${host}:${port}`,
    bridgeHints: [`http://${host}:${port}`],
    macName: hostname(),
  });
  const sessionStore = new BridgeSessionStore();
  const listeners = new Set<ServerWebSocket<undefined>>();
  let relaySocket: WebSocket | null = null;
  let relayReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let relayConnected = false;
  let codexAccount: OffdexRuntimeAccount | null = null;
  let remoteBootstrap:
    | {
        controlPlaneUrl: string;
        machineId: string;
        claimCode: string;
        ownerLabel: string;
      }
    | null = null;
  const codexRuntime =
    bridgeMode === "codex"
      ? new CodexBridgeRuntime({
          runtimeTarget: "cli",
          workspaceStore,
          cwd: process.cwd(),
        })
      : null;

  const buildHealthPayload = () => ({
    ok: true,
    transport: "bridge",
    bridgeMode,
    bridgeUrl: workspaceStore.getSnapshot().pairing.bridgeUrl,
    bridgeHints: workspaceStore.getSnapshot().pairing.bridgeHints,
    macName: workspaceStore.getSnapshot().pairing.macName,
    desktopAvailable,
    codexConnected: codexRuntime?.client.isConnected ?? false,
    codexAccount,
    liveClientCount: listeners.size,
    relayConnected,
    relayUrl: managedRelayUrl ?? bridgeState.relayUrl,
    session: sessionStore.getActiveSession(),
  });

  const managedRelayUrl = controlPlaneUrl ? normalizeHttpBaseUrl(controlPlaneUrl) : null;

  const refreshWorkspaceSnapshot = async () => {
    if (!codexRuntime) {
      return workspaceStore.getSnapshot();
    }

    const snapshot = await codexRuntime.refreshSnapshot();
    codexAccount = snapshot.account;
    return snapshot;
  };

  const readInventory = async () => {
    const localInventory = readWorkbenchInventory();
    if (!codexRuntime) {
      return localInventory;
    }

    const runtimeInventory = await codexRuntime.readWorkbenchInventory().catch(() => null);
    if (!runtimeInventory) {
      return localInventory;
    }

    return {
      ...localInventory,
      plugins: runtimeInventory.plugins.length > 0 ? runtimeInventory.plugins : localInventory.plugins,
      skills: runtimeInventory.skills.length > 0 ? runtimeInventory.skills : localInventory.skills,
      mcpServers:
        runtimeInventory.mcpServers.length > 0 ? runtimeInventory.mcpServers : localInventory.mcpServers,
      automations:
        runtimeInventory.automations.length > 0 ? runtimeInventory.automations : localInventory.automations,
      apps: runtimeInventory.apps ?? [],
      models: runtimeInventory.models ?? [],
      config: (runtimeInventory.config ?? null) satisfies OffdexConfigSummary | null,
      rateLimits: runtimeInventory.rateLimits ?? localInventory.rateLimits ?? null,
      experimentalFeatures: runtimeInventory.experimentalFeatures ?? localInventory.experimentalFeatures ?? [],
    } satisfies OffdexWorkbenchInventory;
  };

  const startAccountLogin = async (body: {
    type?: "chatgpt";
  }): Promise<{ session: OffdexAccountLoginSession }> => {
    if (!codexRuntime) {
      throw new Error("Account login is only available in codex mode.");
    }

    return {
      session: await codexRuntime.startAccountLogin(body.type ?? "chatgpt"),
    };
  };

  const cancelAccountLogin = async (body: {
    loginId?: string | null;
  }): Promise<{ ok: true }> => {
    if (!codexRuntime) {
      throw new Error("Account login cancel is only available in codex mode.");
    }

    if (!body.loginId?.trim()) {
      throw new Error("Account login cancel rejected. Missing login id.");
    }

    await codexRuntime.cancelAccountLogin(body.loginId.trim());
    return { ok: true };
  };

  const logoutAccount = async (): Promise<{ snapshot: ReturnType<typeof workspaceStore.getSnapshot> }> => {
    if (!codexRuntime) {
      throw new Error("Account logout is only available in codex mode.");
    }

    const snapshot = await codexRuntime.logoutAccount();
    codexAccount = {
      id: null,
      email: null,
      name: null,
      planType: null,
      isAuthenticated: false,
    };
    return {
      snapshot,
    };
  };

  const applyRuntimeSelection = async (preferredTarget: RuntimeTarget) => {
    const resolution = resolveRuntimeTarget({
      hostPlatform:
        process.platform === "darwin"
          ? "darwin"
          : process.platform === "win32"
            ? "win32"
            : "linux",
      preferredTarget,
      desktopAvailable,
    });

    const session = createBridgeSession(
      `OFFDEX-${resolution.target.toUpperCase()}`,
      resolution.target
    );
    sessionStore.connect(session);
    workspaceStore.updatePairingProfile({
      bridgeUrl: workspaceStore.getSnapshot().pairing.bridgeUrl,
      bridgeHints: workspaceStore.getSnapshot().pairing.bridgeHints,
      macName: workspaceStore.getSnapshot().pairing.macName,
      state: "paired",
      lastSeenAt: "Just now",
    });

    if (codexRuntime) {
      const snapshot = await codexRuntime.setRuntimeTarget(resolution.target);
      return {
        session,
        resolution,
        snapshot,
      };
    }

    workspaceStore.setRuntimeTarget(resolution.target);
    workspaceStore.updatePairingState("paired", "Just now");
    workspaceStore.appendMessage({
      threadId: "thread-foundation",
      message: makeMessage(
        `runtime-${Date.now()}`,
        "assistant",
        `Runtime changed to ${resolution.target}. ${resolution.reason}`,
        "Now"
      ),
      state: "running",
      updatedAt: "Now",
    });

    return {
      session,
      resolution,
      snapshot: workspaceStore.getSnapshot(),
    };
  };

  const applyTurnRequest = async (body: Partial<BridgeTurnInput>) => {
    if (codexRuntime) {
      return {
        snapshot: await codexRuntime.sendTurn(
          body.threadId ?? NEW_THREAD_ID,
          body.body ?? "",
          body.inputs
        ),
      };
    }

    const accepted = recordBridgeTurn(workspaceStore, {
      threadId: body.threadId ?? "",
      body: body.body ?? "",
    });

    if (!accepted) {
      throw new Error("Turn rejected. Missing thread or empty body.");
    }

    return {
      snapshot: workspaceStore.getSnapshot(),
    };
  };

  const applyInterruptRequest = async (threadId: string | undefined) => {
    if (codexRuntime) {
      return {
        snapshot: await codexRuntime.interruptThread(threadId ?? ""),
      };
    }

    if (!threadId) {
      throw new Error("Interrupt rejected. Missing thread.");
    }

    return {
      snapshot: workspaceStore.getSnapshot(),
    };
  };

  const applySteerRequest = async (body: Partial<BridgeTurnInput>) => {
    if (!codexRuntime) {
      throw new Error("Steer is only available in codex mode.");
    }

    if (!body.threadId) {
      throw new Error("Steer rejected. Missing thread.");
    }

    return {
      snapshot: await codexRuntime.steerTurn(body.threadId, body.body ?? "", body.inputs),
    };
  };

  const applyApprovalRequest = async (body: {
    approvalId?: string;
    approve?: boolean;
    answers?: Record<string, string>;
  }) => {
    if (!codexRuntime) {
      throw new Error("Approvals are only available in codex mode.");
    }

    if (!body.approvalId) {
      throw new Error("Approval rejected. Missing approval id.");
    }

    return {
      snapshot: await codexRuntime.resolveApproval(body.approvalId, {
        approve: body.approve === true,
        answers: body.answers,
      }),
    };
  };

  const listRemoteFiles = async (path: string): Promise<{ entries: OffdexRemoteFileEntry[] }> => {
    if (!codexRuntime) {
      throw new Error("Remote workspace files are only available in codex mode.");
    }

    return {
      entries: await codexRuntime.readRemoteDirectory(path),
    };
  };

  const writeRuntimeConfig = async (body: {
    keyPath?: string;
    value?: unknown;
    filePath?: string | null;
  }): Promise<{ inventory: OffdexWorkbenchInventory }> => {
    if (!codexRuntime) {
      throw new Error("Config updates are only available in codex mode.");
    }

    if (!body.keyPath) {
      throw new Error("Config update rejected. Missing key path.");
    }

    return {
      inventory: await codexRuntime.writeConfigValue(body.keyPath, body.value, body.filePath ?? null),
    };
  };

  const writeRuntimeConfigBatch = async (body: {
    edits?: Array<{ keyPath?: string; value?: unknown }>;
    filePath?: string | null;
  }): Promise<{ inventory: OffdexWorkbenchInventory }> => {
    if (!codexRuntime) {
      throw new Error("Config updates are only available in codex mode.");
    }

    const edits = body.edits ?? [];
    if (edits.length === 0 || edits.some((edit) => !edit.keyPath?.trim())) {
      throw new Error("Batch config update rejected. Missing key path.");
    }

    return {
      inventory: await codexRuntime.writeConfigValues(
        edits.map((edit) => ({
          keyPath: edit.keyPath?.trim() ?? "",
          value: edit.value,
        })),
        body.filePath ?? null
      ),
    };
  };

  const setExperimentalFeature = async (body: {
    name?: string | null;
    enabled?: boolean;
  }): Promise<{ inventory: OffdexWorkbenchInventory }> => {
    if (!codexRuntime) {
      throw new Error("Experimental feature updates are only available in codex mode.");
    }

    if (!body.name?.trim()) {
      throw new Error("Experimental feature update rejected. Missing feature name.");
    }

    return {
      inventory: await codexRuntime.setExperimentalFeatureEnabled(body.name.trim(), body.enabled === true),
    };
  };

  const writeSkillConfig = async (body: {
    name?: string | null;
    path?: string | null;
    enabled?: boolean;
  }): Promise<{ inventory: OffdexWorkbenchInventory }> => {
    if (!codexRuntime) {
      throw new Error("Skill updates are only available in codex mode.");
    }

    if (!body.name && !body.path) {
      throw new Error("Skill update rejected. Missing selector.");
    }

    return {
      inventory: await codexRuntime.setSkillEnabled({
        name: body.name ?? null,
        path: body.path ?? null,
        enabled: body.enabled === true,
      }),
    };
  };

  const installPlugin = async (body: {
    marketplacePath?: string | null;
    pluginName?: string | null;
  }): Promise<{ inventory: OffdexWorkbenchInventory }> => {
    if (!codexRuntime) {
      throw new Error("Plugin install is only available in codex mode.");
    }

    if (!body.marketplacePath?.trim() || !body.pluginName?.trim()) {
      throw new Error("Plugin install rejected. Missing marketplace or plugin name.");
    }

    return {
      inventory: await codexRuntime.installPlugin({
        marketplacePath: body.marketplacePath.trim(),
        pluginName: body.pluginName.trim(),
      }),
    };
  };

  const uninstallPlugin = async (body: {
    pluginId?: string | null;
  }): Promise<{ inventory: OffdexWorkbenchInventory }> => {
    if (!codexRuntime) {
      throw new Error("Plugin uninstall is only available in codex mode.");
    }

    if (!body.pluginId?.trim()) {
      throw new Error("Plugin uninstall rejected. Missing plugin id.");
    }

    return {
      inventory: await codexRuntime.uninstallPlugin(body.pluginId.trim()),
    };
  };

  const searchRemoteFiles = async (
    query: string,
    roots: string[]
  ): Promise<{ files: OffdexRemoteFileMatch[] }> => {
    if (!codexRuntime) {
      throw new Error("Remote workspace search is only available in codex mode.");
    }

    return {
      files: await codexRuntime.searchRemoteFiles(query, roots),
    };
  };

  const readGitDiffToRemote = async (cwd?: string | null): Promise<OffdexRemoteDiff> => {
    if (!codexRuntime) {
      throw new Error("Git remote diff is only available in codex mode.");
    }

    return codexRuntime.readGitDiffToRemote(cwd?.trim() || process.cwd());
  };

  const renameThread = async (threadId: string, name: string) => {
    if (!codexRuntime) {
      throw new Error("Thread rename is only available in codex mode.");
    }

    return {
      snapshot: await codexRuntime.renameThread(threadId, name),
    };
  };

  const forkThread = async (threadId: string) => {
    if (!codexRuntime) {
      throw new Error("Thread fork is only available in codex mode.");
    }

    return {
      snapshot: await codexRuntime.forkThread(threadId),
    };
  };

  const archiveThread = async (threadId: string) => {
    if (!codexRuntime) {
      throw new Error("Thread archive is only available in codex mode.");
    }

    return {
      snapshot: await codexRuntime.archiveThread(threadId),
    };
  };

  const unarchiveThread = async (threadId: string) => {
    if (!codexRuntime) {
      throw new Error("Thread restore is only available in codex mode.");
    }

    return {
      snapshot: await codexRuntime.unarchiveThread(threadId),
    };
  };

  const compactThread = async (threadId: string) => {
    if (!codexRuntime) {
      throw new Error("Thread compact is only available in codex mode.");
    }

    return {
      snapshot: await codexRuntime.compactThread(threadId),
    };
  };

  const rollbackThread = async (threadId: string, numTurns: number) => {
    if (!codexRuntime) {
      throw new Error("Thread rewind is only available in codex mode.");
    }
    if (!Number.isInteger(numTurns) || numTurns < 1) {
      throw new Error("Thread rollback rejected. Missing turn count.");
    }

    return {
      snapshot: await codexRuntime.rollbackThread(threadId, numTurns),
    };
  };

  const startReview = async (threadId: string) => {
    if (!codexRuntime) {
      throw new Error("Review is only available in codex mode.");
    }

    return {
      snapshot: await codexRuntime.startReview(threadId),
    };
  };

  const startMcpOauthLogin = async (name: string): Promise<{ authorizationUrl: string }> => {
    if (!codexRuntime) {
      throw new Error("Connector login is only available in codex mode.");
    }

    return {
      authorizationUrl: await codexRuntime.startMcpOauthLogin(name),
    };
  };

  const registerManagedRemote = async () => {
    if (!managedRelayUrl) {
      return;
    }

    const pairing = workspaceStore.getSnapshot().pairing;
    const account =
      codexRuntime && bridgeMode === "codex"
        ? await codexRuntime.readAccountSummary().catch(() => null)
        : null;
    codexAccount = account;
    const ownerId = account?.id ?? account?.email ?? `codex-${bridgeState.bridgeId}`;
    const ownerLabel = account?.email ?? account?.name ?? "Codex on this Mac";
    const response = await fetch(`${managedRelayUrl}/v1/machines/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        machineId: bridgeState.bridgeId,
        machineSecret: bridgeState.bridgeSecret,
        macName: pairing.macName,
        ownerId,
        ownerLabel,
        bridgeUrl: pairing.bridgeUrl,
        bridgeHints: pairing.bridgeHints,
        runtimeTarget: workspaceStore.getSnapshot().pairing.runtimeTarget,
        relayRoomId: bridgeState.relayRoomId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Managed remote registration failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      machine?: {
        remoteCapability?: {
          controlPlaneUrl?: string;
        };
      };
      pairing: { claimCode: string };
    };

    remoteBootstrap = {
      controlPlaneUrl:
        payload.machine?.remoteCapability?.controlPlaneUrl?.trim() || managedRelayUrl,
      machineId: bridgeState.bridgeId,
      claimCode: payload.pairing.claimCode,
      ownerLabel,
    };
  };

  const publishSnapshot = () => {
    const snapshotPayload = {
      type: "workspace.snapshot",
      data: workspaceStore.getSnapshot(),
    };
    const payload = JSON.stringify(snapshotPayload);

    for (const socket of listeners) {
      socket.send(payload);
    }

    if (relaySocket?.readyState === WebSocket.OPEN) {
      relaySocket.send(
        JSON.stringify(
          encryptRelayPayload(bridgeState.bridgeSecret, snapshotPayload)
        )
      );
    }
  };

  const unsubscribe = workspaceStore.subscribe(() => {
    publishSnapshot();
  });

  const connectRelayHost = () => {
    const relayBaseUrl = managedRelayUrl ?? bridgeState.relayUrl;
    if (!relayBaseUrl) {
      return;
    }

    relaySocket?.close();
    relaySocket = new WebSocket(
      `${toRelayHostWsUrl(relayBaseUrl)}/ws/${bridgeState.relayRoomId}?role=host&clientId=${bridgeState.bridgeId}&token=${createRelayAuthToken(
        bridgeState.bridgeSecret,
        bridgeState.relayRoomId
      )}`
    );

    relaySocket.onopen = () => {
      relayConnected = true;
      publishSnapshot();
    };

    relaySocket.onmessage = async (event) => {
      const decoder = new TextDecoder();
      const text =
        typeof event.data === "string"
          ? event.data
          : event.data instanceof ArrayBuffer
            ? decoder.decode(new Uint8Array(event.data))
            : decoder.decode(new Uint8Array(event.data as ArrayBufferLike));

      const envelope = JSON.parse(text) as {
        type?: string;
        id?: string;
        payload?: string;
      };

      if (
        (envelope.type !== "relay.message" && envelope.type !== "relay.proxy") ||
        !envelope.payload
      ) {
        return;
      }

      try {
        const request = decryptRelayPayload<RelayBridgeRequest>(
          bridgeState.bridgeSecret,
          JSON.parse(envelope.type === "relay.proxy" ? envelope.payload : envelope.payload)
        );
        let response: unknown;

        switch (request.action) {
          case "health":
            response = buildHealthPayload();
            break;
          case "snapshot":
            response = await refreshWorkspaceSnapshot();
            break;
          case "inventory":
            response = await readInventory();
            break;
          case "account/login/start":
            response = await startAccountLogin({
              type: request.type ?? "chatgpt",
            });
            break;
          case "account/login/cancel":
            response = await cancelAccountLogin({
              loginId: request.loginId,
            });
            break;
          case "account/logout":
            response = await logoutAccount();
            break;
          case "config/write":
            response = await writeRuntimeConfig({
              keyPath: request.keyPath,
              value: request.value,
              filePath: request.filePath ?? null,
            });
            break;
          case "config/batchWrite":
            response = await writeRuntimeConfigBatch({
              edits: request.edits,
              filePath: request.filePath ?? null,
            });
            break;
          case "experimental-feature/set":
            response = await setExperimentalFeature({
              name: request.name,
              enabled: request.enabled,
            });
            break;
          case "skills/config/write":
            response = await writeSkillConfig({
              name: request.name ?? null,
              path: request.path ?? null,
              enabled: request.enabled,
            });
            break;
          case "plugin/install":
            response = await installPlugin({
              marketplacePath: request.marketplacePath,
              pluginName: request.pluginName,
            });
            break;
          case "plugin/uninstall":
            response = await uninstallPlugin({
              pluginId: request.pluginId,
            });
            break;
          case "git/diff-remote":
            response = await readGitDiffToRemote(request.cwd ?? null);
            break;
          case "files/list":
            response = await listRemoteFiles(request.path);
            break;
          case "files/search":
            response = await searchRemoteFiles(request.query, request.roots);
            break;
          case "runtime":
            response = await applyRuntimeSelection(request.preferredTarget);
            break;
          case "turn":
            response = await applyTurnRequest({
              threadId: request.threadId,
              body: request.body,
              inputs: request.inputs,
            });
            break;
          case "turn/steer":
            response = await applySteerRequest({
              threadId: request.threadId,
              body: request.body,
              inputs: request.inputs,
            });
            break;
          case "interrupt":
            response = await applyInterruptRequest(request.threadId);
            break;
          case "thread/rename":
            response = await renameThread(request.threadId, request.name);
            break;
          case "thread/fork":
            response = await forkThread(request.threadId);
            break;
          case "thread/archive":
            response = await archiveThread(request.threadId);
            break;
          case "thread/unarchive":
            response = await unarchiveThread(request.threadId);
            break;
          case "thread/compact":
            response = await compactThread(request.threadId);
            break;
          case "thread/rollback":
            response = await rollbackThread(request.threadId, request.numTurns);
            break;
          case "review/start":
            response = await startReview(request.threadId);
            break;
          case "mcp/oauth/login":
            response = await startMcpOauthLogin(request.name);
            break;
          case "approval":
            response = await applyApprovalRequest({
              approvalId: request.approvalId,
              approve: request.approve,
              answers: request.answers,
            });
            break;
        }

        relaySocket?.send(
          JSON.stringify({
            type: "relay.response",
            id: envelope.id ?? request.id,
            payload: JSON.stringify(
              encryptRelayPayload(bridgeState.bridgeSecret, response)
            ),
          })
        );
      } catch (error) {
        relaySocket?.send(
          JSON.stringify({
            type: "relay.response",
            id: envelope.id,
            error: error instanceof Error ? error.message : "Relay request failed.",
          })
        );
      }
    };

    const scheduleReconnect = () => {
      relayConnected = false;
      if (relayReconnectTimer || !relayBaseUrl) {
        return;
      }

      relayReconnectTimer = setTimeout(() => {
        relayReconnectTimer = null;
        connectRelayHost();
      }, 2_000);
    };

    relaySocket.onerror = () => {
      scheduleReconnect();
    };

    relaySocket.onclose = () => {
      scheduleReconnect();
    };
  };

  const withCors = (response: Response) => {
    const headers = new Headers(response.headers);
    headers.set("access-control-allow-origin", "*");
    headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
    headers.set("access-control-allow-headers", "content-type");
    headers.set("access-control-allow-private-network", "true");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };

  const server = Bun.serve<undefined>({
    hostname: host,
    port,
    fetch(request, serverRef) {
      const url = new URL(request.url);
      const bridgeTicket = readBridgeTicket(request);
      if (bridgeTicket && !verifyBridgeAccessToken(bridgeState.bridgeSecret, bridgeTicket, {})) {
        return withCors(Response.json({ error: "Invalid bridge ticket." }, { status: 403 }));
      }

      if (request.method === "OPTIONS") {
        return withCors(new Response(null, { status: 204 }));
      }

      if (url.pathname === "/health") {
        return withCors(Response.json(buildHealthPayload()));
      }

      if (url.pathname === "/snapshot") {
        return refreshWorkspaceSnapshot()
          .then((snapshot) => withCors(Response.json(snapshot)))
          .catch((error) =>
            withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Codex snapshot failed.",
                },
                { status: 502 }
              )
            )
          );
      }

      if (url.pathname === "/inventory") {
        return readInventory()
          .then((inventory) => withCors(Response.json(inventory)))
          .catch((error) =>
            withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Bridge inventory failed.",
                },
                { status: 502 }
              )
            )
          );
      }

      if (url.pathname === "/account/login/start" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as { type?: "chatgpt" };
          try {
            return withCors(Response.json(await startAccountLogin(body)));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Account login failed.",
                },
                { status: 502 }
              )
            );
          }
        });
      }

      if (url.pathname === "/account/login/cancel" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as { loginId?: string | null };
          try {
            return withCors(Response.json(await cancelAccountLogin(body)));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Account login cancel failed.",
                },
                {
                  status:
                    error instanceof Error &&
                    error.message === "Account login cancel rejected. Missing login id."
                      ? 400
                      : 502,
                }
              )
            );
          }
        });
      }

      if (url.pathname === "/account/logout" && request.method === "POST") {
        return logoutAccount()
          .then((result) => withCors(Response.json(result)))
          .catch((error) =>
            withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Account logout failed.",
                },
                { status: 502 }
              )
            )
          );
      }

      if (url.pathname === "/config" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as {
            keyPath?: string;
            value?: unknown;
            filePath?: string | null;
          };
          try {
            return withCors(Response.json(await writeRuntimeConfig(body)));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Config update failed.",
                },
                {
                  status:
                    error instanceof Error &&
                    error.message === "Config update rejected. Missing key path."
                      ? 400
                      : 502,
                }
              )
            );
          }
        });
      }

      if (url.pathname === "/config/batch" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as {
            edits?: Array<{ keyPath?: string; value?: unknown }>;
            filePath?: string | null;
          };
          try {
            return withCors(Response.json(await writeRuntimeConfigBatch(body)));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Batch config update failed.",
                },
                {
                  status:
                    error instanceof Error &&
                    error.message === "Batch config update rejected. Missing key path."
                      ? 400
                      : 502,
                }
              )
            );
          }
        });
      }

      if (url.pathname === "/experimental-features" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as {
            name?: string | null;
            enabled?: boolean;
          };
          try {
            return withCors(Response.json(await setExperimentalFeature(body)));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Experimental feature update failed.",
                },
                {
                  status:
                    error instanceof Error &&
                    error.message === "Experimental feature update rejected. Missing feature name."
                      ? 400
                      : 502,
                }
              )
            );
          }
        });
      }

      if (url.pathname === "/skills" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as {
            name?: string | null;
            path?: string | null;
            enabled?: boolean;
          };
          try {
            return withCors(Response.json(await writeSkillConfig(body)));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Skill update failed.",
                },
                {
                  status:
                    error instanceof Error &&
                    error.message === "Skill update rejected. Missing selector."
                      ? 400
                      : 502,
                }
              )
            );
          }
        });
      }

      if (url.pathname === "/plugin/install" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as {
            marketplacePath?: string | null;
            pluginName?: string | null;
          };
          try {
            return withCors(Response.json(await installPlugin(body)));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Plugin install failed.",
                },
                { status: 502 }
              )
            );
          }
        });
      }

      if (url.pathname === "/plugin/uninstall" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as {
            pluginId?: string | null;
          };
          try {
            return withCors(Response.json(await uninstallPlugin(body)));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Plugin uninstall failed.",
                },
                { status: 502 }
              )
            );
          }
        });
      }

      if (url.pathname === "/files") {
        const path = url.searchParams.get("path")?.trim();
        if (!path) {
          return withCors(Response.json({ error: "Missing path." }, { status: 400 }));
        }

        return listRemoteFiles(path)
          .then((result) => withCors(Response.json(result)))
          .catch((error) =>
            withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Remote file listing failed.",
                },
                { status: 502 }
              )
            )
          );
      }

      if (url.pathname === "/file-search") {
        const query = url.searchParams.get("query")?.trim() ?? "";
        const roots = url.searchParams.getAll("root").map((entry) => entry.trim()).filter(Boolean);
        if (!query || roots.length === 0) {
          return withCors(
            Response.json({ error: "Missing query or root." }, { status: 400 })
          );
        }

        return searchRemoteFiles(query, roots)
          .then((result) => withCors(Response.json(result)))
          .catch((error) =>
            withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Remote file search failed.",
                },
                { status: 502 }
              )
            )
          );
      }

      if (url.pathname === "/git/diff-remote") {
        const cwd = url.searchParams.get("cwd")?.trim() || process.cwd();
        return readGitDiffToRemote(cwd)
          .then((result) => withCors(Response.json(result)))
          .catch((error) =>
            withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Git remote diff failed.",
                },
                { status: 502 }
              )
            )
          );
      }

      if (url.pathname === "/pairing.json") {
        return withCors(
          Response.json(
            createBridgePairingPayload(
              workspaceStore.getSnapshot().pairing,
              bridgeState,
              remoteBootstrap
            )
          )
        );
      }

      if (url.pathname === "/pairing") {
        return renderPairingPage(
          createBridgePairingPayload(
            workspaceStore.getSnapshot().pairing,
            bridgeState,
            remoteBootstrap
          )
        ).then((html) =>
          withCors(
            new Response(html, {
              headers: {
                "content-type": "text/html; charset=utf-8",
              },
            })
          )
        );
      }

      if (url.pathname === "/runtime" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as { preferredTarget?: RuntimeTarget };
          return withCors(
            Response.json(
              await applyRuntimeSelection(
                body?.preferredTarget === "desktop" ? "desktop" : "cli"
              )
            )
          );
        });
      }

      if (url.pathname === "/turn" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as Partial<BridgeTurnInput>;
          try {
            return withCors(Response.json(await applyTurnRequest(body)));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Codex turn failed.",
                },
                {
                  status:
                    error instanceof Error &&
                    error.message === "Turn rejected. Missing thread or empty body."
                      ? 400
                      : 502,
                }
              )
            );
          }
        });
      }

      if (url.pathname === "/interrupt" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as { threadId?: string };
          try {
            return withCors(Response.json(await applyInterruptRequest(body.threadId)));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error:
                    error instanceof Error ? error.message : "Codex interrupt failed.",
                },
                {
                  status:
                    error instanceof Error &&
                    error.message === "Interrupt rejected. Missing thread."
                      ? 400
                      : 502,
                }
              )
            );
          }
        });
      }

      if (url.pathname === "/turn/steer" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as Partial<BridgeTurnInput>;
          try {
            return withCors(Response.json(await applySteerRequest(body)));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Codex steer failed.",
                },
                {
                  status:
                    error instanceof Error &&
                    (error.message === "Steer rejected. Missing thread." ||
                      error.message === "No active turn is available to steer.")
                      ? 400
                      : 502,
                }
              )
            );
          }
        });
      }

      if (url.pathname === "/approval" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as {
            approvalId?: string;
            approve?: boolean;
            answers?: Record<string, string>;
          };
          try {
            return withCors(Response.json(await applyApprovalRequest(body)));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error:
                    error instanceof Error ? error.message : "Codex approval failed.",
                },
                {
                  status:
                    error instanceof Error &&
                    error.message === "Approval rejected. Missing approval id."
                      ? 400
                      : 502,
                }
              )
            );
          }
        });
      }

      if (url.pathname === "/thread/rename" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as { threadId?: string; name?: string };
          if (!body.threadId || !body.name?.trim()) {
            return withCors(Response.json({ error: "Missing thread or name." }, { status: 400 }));
          }
          try {
            return withCors(Response.json(await renameThread(body.threadId, body.name.trim())));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Thread rename failed.",
                },
                { status: 502 }
              )
            );
          }
        });
      }

      if (url.pathname === "/thread/fork" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as { threadId?: string };
          if (!body.threadId) {
            return withCors(Response.json({ error: "Missing thread." }, { status: 400 }));
          }
          try {
            return withCors(Response.json(await forkThread(body.threadId)));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Thread fork failed.",
                },
                { status: 502 }
              )
            );
          }
        });
      }

      if (url.pathname === "/thread/archive" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as { threadId?: string };
          if (!body.threadId) {
            return withCors(Response.json({ error: "Missing thread." }, { status: 400 }));
          }
          try {
            return withCors(Response.json(await archiveThread(body.threadId)));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Thread archive failed.",
                },
                { status: 502 }
              )
            );
          }
        });
      }

      if (url.pathname === "/thread/unarchive" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as { threadId?: string };
          if (!body.threadId) {
            return withCors(Response.json({ error: "Missing thread." }, { status: 400 }));
          }
          try {
            return withCors(Response.json(await unarchiveThread(body.threadId)));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Thread restore failed.",
                },
                { status: 502 }
              )
            );
          }
        });
      }

      if (url.pathname === "/thread/compact" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as { threadId?: string };
          if (!body.threadId) {
            return withCors(Response.json({ error: "Missing thread." }, { status: 400 }));
          }
          try {
            return withCors(Response.json(await compactThread(body.threadId)));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Thread compact failed.",
                },
                { status: 502 }
              )
            );
          }
        });
      }

      if (url.pathname === "/thread/rollback" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as { threadId?: string; numTurns?: number };
          if (!body.threadId) {
            return withCors(Response.json({ error: "Missing thread." }, { status: 400 }));
          }
          try {
            return withCors(Response.json(await rollbackThread(body.threadId, body.numTurns ?? 0)));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Thread rewind failed.",
                },
                {
                  status:
                    error instanceof Error &&
                    error.message === "Thread rollback rejected. Missing turn count."
                      ? 400
                      : 502,
                }
              )
            );
          }
        });
      }

      if (url.pathname === "/review" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as { threadId?: string };
          if (!body.threadId) {
            return withCors(Response.json({ error: "Missing thread." }, { status: 400 }));
          }
          try {
            return withCors(Response.json(await startReview(body.threadId)));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Review start failed.",
                },
                { status: 502 }
              )
            );
          }
        });
      }

      if (url.pathname === "/mcp/oauth/login" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as { name?: string };
          if (!body.name?.trim()) {
            return withCors(Response.json({ error: "Missing connector." }, { status: 400 }));
          }
          try {
            return withCors(Response.json(await startMcpOauthLogin(body.name.trim())));
          } catch (error) {
            return withCors(
              Response.json(
                {
                  error: error instanceof Error ? error.message : "Connector login failed.",
                },
                { status: 502 }
              )
            );
          }
        });
      }

      if (url.pathname === "/live") {
        const upgraded = serverRef.upgrade(request);
        return upgraded ? undefined : withCors(new Response("Upgrade failed", { status: 400 }));
      }

      return withCors(new Response("Not found", { status: 404 }));
    },
    websocket: {
      open(socket) {
        listeners.add(socket);
        socket.send(
          JSON.stringify({
            type: "workspace.snapshot",
            data: workspaceStore.getSnapshot(),
          })
        );
      },
      message() {},
      close(socket) {
        listeners.delete(socket);
      },
    },
  });

  const serverPort = server.port ?? port;
  const bridgeHints = buildBridgeHints(serverPort, networkInterfaces, hostname, host);
  workspaceStore.updatePairingProfile({
    bridgeUrl: bridgeHints[0] ?? `http://${host}:${serverPort}`,
    bridgeHints,
    macName: hostname(),
  });
  void registerManagedRemote()
    .catch(() => {})
    .finally(() => {
      connectRelayHost();
    });

  return {
    server,
    workspaceStore,
    sessionStore,
    bridgeState,
    getPairingPayload() {
      return createBridgePairingPayload(
        workspaceStore.getSnapshot().pairing,
        bridgeState,
        remoteBootstrap
      );
    },
    stop() {
      unsubscribe();
      void codexRuntime?.close();
      if (relayReconnectTimer) {
        clearTimeout(relayReconnectTimer);
      }
      relaySocket?.close();
      server.stop(true);
      listeners.clear();
    },
  };
}
