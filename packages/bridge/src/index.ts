import { hostname, networkInterfaces } from "node:os";
import type { ServerWebSocket } from "bun";
import QRCode from "qrcode";
import {
  type OffdexPairingProfile,
  WorkspaceSnapshotStore,
  encodePairingUri,
  makeDemoWorkspaceSnapshot,
  makeMessage,
  type RuntimeTarget,
} from "@offdex/protocol";
import {
  CodexBridgeRuntime,
  NEW_THREAD_ID,
  applyCodexNotification,
  buildCodexExecutableCandidates,
  createCodexSnapshot,
  findActiveTurnId,
  mapCodexThreadToOffdexThread,
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
}

export interface BridgePairingPayload {
  bridgeUrl: string;
  bridgeHints: string[];
  macName: string;
  pairingUri: string;
}

type BridgeAddressRecord = {
  address: string;
  family: string | number;
  internal: boolean;
};

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
  pairingProfile: OffdexPairingProfile
): BridgePairingPayload {
  return {
    bridgeUrl: pairingProfile.bridgeUrl,
    bridgeHints: pairingProfile.bridgeHints,
    macName: pairingProfile.macName,
    pairingUri: encodePairingUri({
      bridgeUrl: pairingProfile.bridgeUrl,
      macName: pairingProfile.macName,
    }),
  };
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
  const desktopAvailable =
    options.desktopAvailable ?? Boolean(process.env.OFFDEX_DESKTOP_ENDPOINT);
  const workspaceStore = createBridgeWorkspaceStore("cli", {
    bridgeUrl: `http://${host}:${port}`,
    bridgeHints: [`http://${host}:${port}`],
    macName: hostname(),
  });
  const sessionStore = new BridgeSessionStore();
  const listeners = new Set<ServerWebSocket<undefined>>();
  const codexRuntime =
    bridgeMode === "codex"
      ? new CodexBridgeRuntime({
          runtimeTarget: "cli",
          workspaceStore,
          cwd: process.cwd(),
        })
      : null;

  const publishSnapshot = () => {
    const payload = JSON.stringify({
      type: "workspace.snapshot",
      data: workspaceStore.getSnapshot(),
    });

    for (const socket of listeners) {
      socket.send(payload);
    }
  };

  const unsubscribe = workspaceStore.subscribe(() => {
    publishSnapshot();
  });

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

      if (request.method === "OPTIONS") {
        return withCors(new Response(null, { status: 204 }));
      }

      if (url.pathname === "/health") {
        return withCors(
          Response.json({
            ok: true,
            transport: "bridge",
            bridgeMode,
            bridgeUrl: workspaceStore.getSnapshot().pairing.bridgeUrl,
            bridgeHints: workspaceStore.getSnapshot().pairing.bridgeHints,
            macName: workspaceStore.getSnapshot().pairing.macName,
            desktopAvailable,
            codexConnected: codexRuntime?.client.isConnected ?? false,
            session: sessionStore.getActiveSession(),
          })
        );
      }

      if (url.pathname === "/snapshot") {
        if (!codexRuntime) {
          return withCors(Response.json(workspaceStore.getSnapshot()));
        }

        return codexRuntime
          .refreshSnapshot()
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
          Response.json(createBridgePairingPayload(workspaceStore.getSnapshot().pairing))
        );
      }

      if (url.pathname === "/pairing") {
        return renderPairingPage(
          createBridgePairingPayload(workspaceStore.getSnapshot().pairing)
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
          const preferredTarget = body?.preferredTarget === "desktop" ? "desktop" : "cli";
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
            return withCors(
              Response.json({
                session,
                resolution,
                snapshot,
              })
            );
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

          return withCors(
            Response.json({
              session,
              resolution,
              snapshot: workspaceStore.getSnapshot(),
            })
          );
        });
      }

      if (url.pathname === "/turn" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as Partial<BridgeTurnInput>;

          if (codexRuntime) {
            try {
              const snapshot = await codexRuntime.sendTurn(
                body.threadId ?? NEW_THREAD_ID,
                body.body ?? ""
              );
              return withCors(Response.json({ snapshot }));
            } catch (error) {
              return withCors(
                Response.json(
                  {
                    error: error instanceof Error ? error.message : "Codex turn failed.",
                  },
                  { status: 502 }
                )
              );
            }
          }

          const accepted = recordBridgeTurn(workspaceStore, {
            threadId: body.threadId ?? "",
            body: body.body ?? "",
          });

          if (!accepted) {
            return withCors(
              Response.json(
                { error: "Turn rejected. Missing thread or empty body." },
                { status: 400 }
              )
            );
          }

          return withCors(
            Response.json({
              snapshot: workspaceStore.getSnapshot(),
            })
          );
        });
      }

      if (url.pathname === "/interrupt" && request.method === "POST") {
        return request.json().then(async (rawBody) => {
          const body = rawBody as { threadId?: string };

          if (codexRuntime) {
            try {
              const snapshot = await codexRuntime.interruptThread(body.threadId ?? "");
              return withCors(Response.json({ snapshot }));
            } catch (error) {
              return withCors(
                Response.json(
                  {
                    error:
                      error instanceof Error ? error.message : "Codex interrupt failed.",
                  },
                  { status: 502 }
                )
              );
            }
          }

          if (!body.threadId) {
            return withCors(
              Response.json({ error: "Interrupt rejected. Missing thread." }, { status: 400 })
            );
          }

          return withCors(Response.json({ snapshot: workspaceStore.getSnapshot() }));
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

  return {
    server,
    workspaceStore,
    sessionStore,
    stop() {
      unsubscribe();
      void codexRuntime?.close();
      server.stop(true);
      listeners.clear();
    },
  };
}
