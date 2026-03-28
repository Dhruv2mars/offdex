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
