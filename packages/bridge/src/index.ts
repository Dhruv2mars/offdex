import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  type OffdexRuntimeAccount,
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
  | { id: string; action: "runtime"; preferredTarget: RuntimeTarget }
  | { id: string; action: "turn"; threadId: string; body: string }
  | { id: string; action: "interrupt"; threadId: string };

function shouldColorTerminal() {
  return Boolean(process.stdout.isTTY) &&
    process.env.NO_COLOR !== "1" &&
    process.env.NO_COLOR !== "true" &&
    process.env.TERM !== "dumb";
}

function paintTerminal(code: string, text: string) {
  return shouldColorTerminal() ? `\u001b[${code}m${text}\u001b[0m` : text;
}

function openAiGreen(text: string) {
  return paintTerminal("38;2;16;163;127", text);
}

function openAiMint(text: string) {
  return paintTerminal("38;2;203;255;229", text);
}

function openAiMuted(text: string) {
  return paintTerminal("38;2;156;163;160", text);
}

function terminalBold(text: string) {
  return paintTerminal("1", text);
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
  readHostname: typeof hostname = hostname
) {
  const urls = new Set<string>();
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

  return [openAiGreen("Scan with Offdex"), qr, ""].join("\n");
}

export async function createBridgeStartupOutput(input: {
  payload: BridgePairingPayload;
  relayUrl: string | null;
}) {
  const qrOutput = await createTerminalPairingOutput(input.payload.pairingUri);
  const lines = [
    terminalBold(openAiGreen("Offdex is running")),
    "Scan the QR in the mobile app.",
    `${openAiMuted("Bridge:")} ${openAiMint(input.payload.bridgeUrl)}`,
    `${openAiMuted("Web UI:")} ${openAiMint(createBridgeWebUiUrl(input.payload.bridgeUrl, undefined, input.payload.pairingUri))}`,
    `${openAiMuted("Remote:")} ${input.relayUrl ? "connected" : "local network only"}`,
    `${openAiMuted("Manage:")} offdex status | offdex stop`,
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

    return codexRuntime.refreshSnapshot();
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
        snapshot: await codexRuntime.sendTurn(body.threadId ?? NEW_THREAD_ID, body.body ?? ""),
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
          case "runtime":
            response = await applyRuntimeSelection(request.preferredTarget);
            break;
          case "turn":
            response = await applyTurnRequest({
              threadId: request.threadId,
              body: request.body,
            });
            break;
          case "interrupt":
            response = await applyInterruptRequest(request.threadId);
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
  const bridgeHints = buildBridgeHints(serverPort);
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
