import type { ServerWebSocket } from "bun";
import {
  WorkspaceSnapshotStore,
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

export function createBridgeWorkspaceStore(runtimeTarget: RuntimeTarget = "cli") {
  return new WorkspaceSnapshotStore(makeDemoWorkspaceSnapshot(runtimeTarget));
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
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 42420;
  const bridgeMode = options.bridgeMode ?? "demo";
  const desktopAvailable =
    options.desktopAvailable ?? Boolean(process.env.OFFDEX_DESKTOP_ENDPOINT);
  const workspaceStore = createBridgeWorkspaceStore();
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
