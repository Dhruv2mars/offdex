import type { ServerWebSocket } from "bun";

export interface RelayRoomSnapshot {
  id: string;
  hostConnected: boolean;
  clientCount: number;
}

interface RelayRoomState {
  hostConnected: boolean;
  clients: Set<string>;
}

export class RelayRegistry {
  #rooms = new Map<string, RelayRoomState>();

  connectHost(roomId: string) {
    const room = this.#rooms.get(roomId) ?? { hostConnected: false, clients: new Set<string>() };
    room.hostConnected = true;
    this.#rooms.set(roomId, room);
  }

  disconnectHost(roomId: string) {
    const room = this.#rooms.get(roomId);
    if (!room) {
      return;
    }

    room.hostConnected = false;
  }

  connectClient(roomId: string, clientId: string) {
    const room = this.#rooms.get(roomId) ?? { hostConnected: false, clients: new Set<string>() };
    room.clients.add(clientId);
    this.#rooms.set(roomId, room);
  }

  disconnectClient(roomId: string, clientId: string) {
    const room = this.#rooms.get(roomId);
    room?.clients.delete(clientId);
  }

  snapshot(roomId: string): RelayRoomSnapshot {
    const room = this.#rooms.get(roomId) ?? { hostConnected: false, clients: new Set<string>() };
    return {
      id: roomId,
      hostConnected: room.hostConnected,
      clientCount: room.clients.size,
    };
  }
}

export interface RelayServerOptions {
  host?: string;
  port?: number;
}

interface RelaySocketData {
  roomId: string;
  clientId: string;
  role: "host" | "client";
}

export function startRelayServer(options: RelayServerOptions = {}) {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 42421;
  const registry = new RelayRegistry();
  const socketsByRoom = new Map<string, Set<ServerWebSocket<RelaySocketData>>>();

  const broadcastRoomSnapshot = (roomId: string) => {
    const roomSockets = socketsByRoom.get(roomId);
    if (!roomSockets) {
      return;
    }

    const payload = JSON.stringify({
      type: "relay.room",
      data: registry.snapshot(roomId),
    });

    for (const socket of roomSockets) {
      socket.send(payload);
    }
  };

  const server = Bun.serve<RelaySocketData>({
    hostname: host,
    port,
    fetch(request, serverRef) {
      const url = new URL(request.url);

      if (url.pathname === "/health") {
        return Response.json({ ok: true, transport: "relay" });
      }

      if (url.pathname.startsWith("/room/") && request.method === "GET") {
        const roomId = url.pathname.replace("/room/", "");
        return Response.json(registry.snapshot(roomId));
      }

      if (url.pathname.startsWith("/ws/")) {
        const roomId = url.pathname.replace("/ws/", "");
        const role = url.searchParams.get("role") === "host" ? "host" : "client";
        const clientId = url.searchParams.get("clientId") || `client-${Date.now()}`;
        const upgraded = serverRef.upgrade(request, {
          data: { roomId, clientId, role } satisfies RelaySocketData,
        });
        return upgraded ? undefined : new Response("Upgrade failed", { status: 400 });
      }

      return new Response("Not found", { status: 404 });
    },
    websocket: {
      open(socket) {
        const { roomId, clientId, role } = socket.data;
        const roomSockets = socketsByRoom.get(roomId) ?? new Set();
        roomSockets.add(socket);
        socketsByRoom.set(roomId, roomSockets);

        if (role === "host") {
          registry.connectHost(roomId);
        } else {
          registry.connectClient(roomId, clientId);
        }

        broadcastRoomSnapshot(roomId);
      },
      message(socket, message) {
        const roomId = socket.data.roomId;
        const roomSockets = socketsByRoom.get(roomId) ?? new Set();

        for (const peer of roomSockets) {
          if (peer === socket) {
            continue;
          }

          peer.send(
            JSON.stringify({
              type: "relay.message",
              roomId,
              from: socket.data.clientId,
              payload: typeof message === "string" ? message : Buffer.from(message).toString("utf8"),
            })
          );
        }
      },
      close(socket) {
        const { roomId, clientId, role } = socket.data;
        const roomSockets = socketsByRoom.get(roomId);
        roomSockets?.delete(socket);

        if (role === "host") {
          registry.disconnectHost(roomId);
        } else {
          registry.disconnectClient(roomId, clientId);
        }

        if (roomSockets && roomSockets.size === 0) {
          socketsByRoom.delete(roomId);
        }

        broadcastRoomSnapshot(roomId);
      },
    },
  });

  return {
    registry,
    server,
    stop() {
      server.stop(true);
      socketsByRoom.clear();
    },
  };
}
