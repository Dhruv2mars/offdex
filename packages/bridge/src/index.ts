import type { ServerWebSocket } from "bun";
import {
  WorkspaceSnapshotStore,
  makeDemoWorkspaceSnapshot,
  makeMessage,
  type RuntimeTarget,
} from "@offdex/protocol";

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

export function resolveRuntimeTarget(input: RuntimeResolutionInput): RuntimeResolution {
  if (input.preferredTarget === "desktop" && input.desktopAvailable && input.hostPlatform === "darwin") {
    return {
      target: "desktop",
      reason: "Desktop runtime available on this Mac.",
    };
  }

  if (input.preferredTarget === "desktop") {
    return {
      target: "cli",
      reason: "Desktop runtime unavailable here. Falling back to Codex CLI.",
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

  const thread = workspaceStore
    .getSnapshot()
    .threads.find((entry) => entry.id === input.threadId);

  if (!thread) {
    return false;
  }

  workspaceStore.appendMessage({
    threadId: input.threadId,
    message: makeMessage(`user-${Date.now()}`, "user", trimmed, "Now"),
    state: "running",
    updatedAt: "Now",
  });

  workspaceStore.appendMessage({
    threadId: input.threadId,
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
  const desktopAvailable = options.desktopAvailable ?? process.platform === "darwin";
  const workspaceStore = createBridgeWorkspaceStore();
  const sessionStore = new BridgeSessionStore();
  const listeners = new Set<ServerWebSocket<undefined>>();

  const publishSnapshot = () => {
    const payload = JSON.stringify({
      type: "workspace.snapshot",
      data: workspaceStore.getSnapshot(),
    });

    for (const socket of listeners) {
      socket.send(payload);
    }
  };

  const server = Bun.serve<undefined>({
    hostname: host,
    port,
    fetch(request, serverRef) {
      const url = new URL(request.url);

      if (url.pathname === "/health") {
        return Response.json({
          ok: true,
          transport: "bridge",
          desktopAvailable,
          session: sessionStore.getActiveSession(),
        });
      }

      if (url.pathname === "/snapshot") {
        return Response.json(workspaceStore.getSnapshot());
      }

      if (url.pathname === "/runtime" && request.method === "POST") {
        return request.json().then((rawBody) => {
          const body = rawBody as { preferredTarget?: RuntimeTarget };
          const preferredTarget = body?.preferredTarget === "desktop" ? "desktop" : "cli";
          const resolution = resolveRuntimeTarget({
            hostPlatform: process.platform === "darwin" ? "darwin" : process.platform === "win32" ? "win32" : "linux",
            preferredTarget,
            desktopAvailable,
          });

          const session = createBridgeSession(`OFFDEX-${resolution.target.toUpperCase()}`, resolution.target);
          sessionStore.connect(session);
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
          publishSnapshot();

          return Response.json({
            session,
            resolution,
            snapshot: workspaceStore.getSnapshot(),
          });
        });
      }

      if (url.pathname === "/turn" && request.method === "POST") {
        return request.json().then((rawBody) => {
          const body = rawBody as Partial<BridgeTurnInput>;
          const accepted = recordBridgeTurn(workspaceStore, {
            threadId: body.threadId ?? "",
            body: body.body ?? "",
          });

          if (!accepted) {
            return Response.json(
              { error: "Turn rejected. Missing thread or empty body." },
              { status: 400 }
            );
          }

          publishSnapshot();
          return Response.json({
            snapshot: workspaceStore.getSnapshot(),
          });
        });
      }

      if (url.pathname === "/live") {
        const upgraded = serverRef.upgrade(request);
        return upgraded ? undefined : new Response("Upgrade failed", { status: 400 });
      }

      return new Response("Not found", { status: 404 });
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
      server.stop(true);
      listeners.clear();
    },
  };
}
