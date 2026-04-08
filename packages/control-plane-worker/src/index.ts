/// <reference types="@cloudflare/workers-types" />

import {
  createRelayAuthToken,
  type DeviceCapabilityMatrix,
  type OffdexAccountSession,
  type OffdexConnectionTicket,
  type OffdexMachineRecord,
  type OffdexTrustedDeviceRecord,
  type RuntimeTarget,
} from "@offdex/protocol";

interface Env {
  OFFDEX_CONTROL_PLANE: DurableObjectNamespace;
  PUBLIC_URL?: string;
}

interface ControlPlaneMachineState {
  machineId: string;
  machineSecret: string;
  macName: string;
  ownerId: string;
  ownerLabel: string;
  bridgeUrl: string;
  bridgeHints: string[];
  runtimeTarget: RuntimeTarget;
  capabilityMatrix: DeviceCapabilityMatrix;
  relayRoomId: string;
  relaySecret: string;
  lastSeenAt: string;
}

interface PairingClaimState {
  claimCode: string;
  machineId: string;
  ownerId: string;
  expiresAt: string;
}

interface DeviceSessionState extends OffdexAccountSession {
  trustedAt: string;
}

interface PersistedControlPlaneState {
  machines: ControlPlaneMachineState[];
  pairingClaims: PairingClaimState[];
  sessions: DeviceSessionState[];
}

interface RelaySocketData {
  roomId: string;
  clientId: string;
  role: "host" | "client";
}

interface PendingProxyRequest {
  resolve: (payload: string) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const EMPTY_STATE: PersistedControlPlaneState = {
  machines: [],
  pairingClaims: [],
  sessions: [],
};

function nowIso() {
  return new Date().toISOString();
}

function plusMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function normalizedOrigin(request: Request, env?: { PUBLIC_URL?: string }) {
  return (env?.PUBLIC_URL || new URL(request.url).origin).replace(/\/+$/, "");
}

function withCors(response: Response) {
  if (response.status === 101) return response;
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  headers.set("access-control-allow-headers", "authorization, content-type");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function makeSession(machine: ControlPlaneMachineState, deviceLabel: string): DeviceSessionState {
  const issuedAt = nowIso();
  return {
    deviceId: crypto.randomUUID(),
    deviceLabel,
    ownerId: machine.ownerId,
    ownerLabel: machine.ownerLabel,
    token: crypto.randomUUID(),
    issuedAt,
    expiresAt: null,
    trustedAt: issuedAt,
  };
}

function toMachineRecord(
  machine: ControlPlaneMachineState,
  input: { controlPlaneUrl: string; online: boolean }
): OffdexMachineRecord {
  return {
    machineId: machine.machineId,
    macName: machine.macName,
    ownerId: machine.ownerId,
    ownerLabel: machine.ownerLabel,
    runtimeTarget: machine.runtimeTarget,
    lastSeenAt: machine.lastSeenAt,
    online: input.online,
    directBridgeUrls: machine.bridgeHints,
    localBridgeUrl: machine.bridgeUrl,
    capabilityMatrix: machine.capabilityMatrix,
    remoteCapability: {
      controlPlaneUrl: input.controlPlaneUrl,
      machineId: machine.machineId,
      directBridgeUrls: machine.bridgeHints,
      relayUrl: input.controlPlaneUrl,
      relayRoomId: machine.relayRoomId,
    },
  };
}

function readBearerSession(request: Request, state: PersistedControlPlaneState) {
  const header = request.headers.get("authorization")?.trim() ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) return null;
  return state.sessions.find((session) => session.token === token) ?? null;
}

export class ControlPlaneRoom implements DurableObject {
  #state: DurableObjectState;
  #env: Env;
  #socketsByRoom = new Map<string, Set<WebSocket>>();
  #socketData = new Map<WebSocket, RelaySocketData>();
  #hostRooms = new Set<string>();
  #pendingProxyRequests = new Map<string, PendingProxyRequest>();

  constructor(state: DurableObjectState, env: Env) {
    this.#state = state;
    this.#env = env;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    const persistedState = await this.#load();
    const controlPlaneUrl = normalizedOrigin(request, this.#env);

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname === "/health") {
      return withCors(Response.json({ ok: true, transport: "cloudflare-control-plane" }));
    }

    if (url.pathname === "/v1/machines/register" && request.method === "POST") {
      return withCors(await this.#registerMachine(request, persistedState, controlPlaneUrl));
    }

    if (url.pathname === "/v1/pairing/claim" && request.method === "POST") {
      return withCors(await this.#claimPairing(request, persistedState, controlPlaneUrl));
    }

    if (url.pathname === "/v1/machines" && request.method === "GET") {
      const session = readBearerSession(request, persistedState);
      if (!session) return withCors(Response.json({ error: "Unauthorized." }, { status: 401 }));
      return withCors(
        Response.json({
          session,
          machines: this.#listMachinesForOwner(persistedState, session.ownerId, controlPlaneUrl),
        })
      );
    }

    if (url.pathname === "/v1/connections/ticket" && request.method === "POST") {
      return withCors(await this.#issueTicket(request, persistedState, controlPlaneUrl));
    }

    if (url.pathname.startsWith("/proxy/") && request.method === "POST") {
      return withCors(await this.#proxyRequest(request, persistedState, url));
    }

    if (url.pathname.startsWith("/ws/")) {
      return this.#upgradeRelaySocket(request, persistedState, url);
    }

    return withCors(new Response("Not found", { status: 404 }));
  }

  async #load(): Promise<PersistedControlPlaneState> {
    return (await this.#state.storage.get<PersistedControlPlaneState>("state")) ?? structuredClone(EMPTY_STATE);
  }

  async #save(state: PersistedControlPlaneState) {
    await this.#state.storage.put("state", state);
  }

  #listMachinesForOwner(
    persistedState: PersistedControlPlaneState,
    ownerId: string,
    controlPlaneUrl: string
  ) {
    return persistedState.machines
      .filter((machine) => machine.ownerId === ownerId)
      .sort((left, right) => left.macName.localeCompare(right.macName))
      .map((machine) =>
        toMachineRecord(machine, {
          controlPlaneUrl,
          online: this.#hostRooms.has(machine.relayRoomId),
        })
      );
  }

  async #registerMachine(
    request: Request,
    persistedState: PersistedControlPlaneState,
    controlPlaneUrl: string
  ) {
    const body = (await request.json()) as {
      machineId: string;
      machineSecret: string;
      macName: string;
      ownerId: string;
      ownerLabel: string;
      bridgeUrl: string;
      bridgeHints: string[];
      runtimeTarget?: RuntimeTarget;
      relayRoomId?: string;
    };

    if (!body.machineId || !body.machineSecret || !body.macName || !body.ownerId || !body.ownerLabel || !body.bridgeUrl) {
      return Response.json({ error: "Missing machine registration fields." }, { status: 400 });
    }

    const existing = persistedState.machines.find((machine) => machine.machineId === body.machineId);
    if (existing && existing.machineSecret !== body.machineSecret) {
      return Response.json({ error: "Machine secret mismatch." }, { status: 403 });
    }

    const nextMachine: ControlPlaneMachineState = {
      machineId: body.machineId,
      machineSecret: body.machineSecret,
      macName: body.macName,
      ownerId: body.ownerId,
      ownerLabel: body.ownerLabel,
      bridgeUrl: body.bridgeUrl,
      bridgeHints: body.bridgeHints.length > 0 ? body.bridgeHints : [body.bridgeUrl],
      runtimeTarget: body.runtimeTarget ?? "cli",
      capabilityMatrix: { mobile: "expo", web: "next", runtimes: ["cli"] },
      relayRoomId: existing?.relayRoomId ?? body.relayRoomId ?? crypto.randomUUID().replaceAll("-", ""),
      relaySecret: existing?.relaySecret ?? body.machineSecret,
      lastSeenAt: nowIso(),
    };

    const pairing: PairingClaimState = {
      claimCode: crypto.randomUUID(),
      machineId: nextMachine.machineId,
      ownerId: nextMachine.ownerId,
      expiresAt: plusMinutes(10),
    };

    persistedState.machines = [
      ...persistedState.machines.filter((machine) => machine.machineId !== nextMachine.machineId),
      nextMachine,
    ];
    persistedState.pairingClaims = [
      ...persistedState.pairingClaims.filter((claim) => claim.machineId !== nextMachine.machineId),
      pairing,
    ];
    await this.#save(persistedState);

    return Response.json({
      machine: {
        ...toMachineRecord(nextMachine, {
          controlPlaneUrl,
          online: this.#hostRooms.has(nextMachine.relayRoomId),
        }),
        relay: {
          roomId: nextMachine.relayRoomId,
          secret: nextMachine.relaySecret,
        },
      },
      pairing,
    });
  }

  async #claimPairing(
    request: Request,
    persistedState: PersistedControlPlaneState,
    controlPlaneUrl: string
  ) {
    const body = (await request.json()) as { claimCode?: string; deviceLabel?: string };
    const claim = persistedState.pairingClaims.find((entry) => entry.claimCode === body.claimCode);
    if (!claim || Date.parse(claim.expiresAt) < Date.now()) {
      return Response.json({ error: "Pairing claim expired." }, { status: 404 });
    }

    const machine = persistedState.machines.find((entry) => entry.machineId === claim.machineId);
    if (!machine) {
      return Response.json({ error: "Machine not found." }, { status: 404 });
    }

    const session = makeSession(machine, body.deviceLabel?.trim() || "Offdex client");
    persistedState.sessions = [...persistedState.sessions, session];
    await this.#save(persistedState);

    return Response.json({
      session,
      trustedDevice: {
        deviceId: session.deviceId,
        deviceLabel: session.deviceLabel,
        ownerId: session.ownerId,
        trustedAt: session.trustedAt,
        lastSeenAt: session.issuedAt,
      } satisfies OffdexTrustedDeviceRecord,
      machines: this.#listMachinesForOwner(persistedState, session.ownerId, controlPlaneUrl),
    });
  }

  async #issueTicket(
    request: Request,
    persistedState: PersistedControlPlaneState,
    controlPlaneUrl: string
  ) {
    const session = readBearerSession(request, persistedState);
    if (!session) return Response.json({ error: "Unauthorized." }, { status: 401 });

    const body = (await request.json()) as { machineId?: string };
    const machine = persistedState.machines.find((entry) => entry.machineId === body.machineId);
    if (!machine || machine.ownerId !== session.ownerId) {
      return Response.json({ error: "Forbidden." }, { status: 403 });
    }

    const ticketId = crypto.randomUUID();
    const expiresAt = plusMinutes(5);
    const ticket: OffdexConnectionTicket = {
      ticketId,
      machineId: machine.machineId,
      ownerId: machine.ownerId,
      transportMode: machine.bridgeHints.length > 0 ? "local" : "relay",
      issuedAt: nowIso(),
      expiresAt,
      local: machine.bridgeHints.length > 0 ? { bridgeUrls: machine.bridgeHints } : null,
      direct: null,
      relay: {
        relayUrl: controlPlaneUrl,
        roomId: machine.relayRoomId,
        secret: machine.relaySecret,
      },
    };

    return Response.json({ ticket });
  }

  async #proxyRequest(
    request: Request,
    persistedState: PersistedControlPlaneState,
    url: URL
  ) {
    const roomId = url.pathname.replace("/proxy/", "");
    const token = url.searchParams.get("token")?.trim() ?? null;
    if (!this.#authorizeRelayRoom(persistedState, roomId, token)) {
      return Response.json({ error: "Unauthorized room access." }, { status: 403 });
    }

    const hostSocket = [...(this.#socketsByRoom.get(roomId) ?? [])].find(
      (socket) => this.#socketData.get(socket)?.role === "host"
    );
    if (!hostSocket) {
      return Response.json({ error: "Host offline." }, { status: 503 });
    }

    const body = (await request.json()) as { payload?: string };
    if (!body.payload) {
      return Response.json({ error: "Missing payload." }, { status: 400 });
    }

    const requestId = `proxy-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    return new Promise<Response>((resolve) => {
      const timer = setTimeout(() => {
        this.#pendingProxyRequests.delete(requestId);
        resolve(Response.json({ error: "Host timed out." }, { status: 504 }));
      }, 10_000);

      this.#pendingProxyRequests.set(requestId, {
        resolve(payload) {
          clearTimeout(timer);
          resolve(Response.json({ payload }));
        },
        reject(error) {
          clearTimeout(timer);
          resolve(Response.json({ error: error.message }, { status: 502 }));
        },
        timer,
      });

      hostSocket.send(JSON.stringify({ type: "relay.proxy", id: requestId, payload: body.payload }));
    });
  }

  #upgradeRelaySocket(request: Request, persistedState: PersistedControlPlaneState, url: URL) {
    const roomId = url.pathname.replace("/ws/", "");
    const role = url.searchParams.get("role") === "host" ? "host" : "client";
    const clientId = url.searchParams.get("clientId") || `client-${Date.now()}`;
    const token = url.searchParams.get("token")?.trim() ?? null;
    if (!this.#authorizeRelayRoom(persistedState, roomId, token)) {
      return Response.json({ error: "Unauthorized room access." }, { status: 403 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    this.#trackSocket(server, { roomId, clientId, role });
    return new Response(null, { status: 101, webSocket: client });
  }

  #trackSocket(socket: WebSocket, data: RelaySocketData) {
    const roomSockets = this.#socketsByRoom.get(data.roomId) ?? new Set<WebSocket>();
    roomSockets.add(socket);
    this.#socketsByRoom.set(data.roomId, roomSockets);
    this.#socketData.set(socket, data);
    if (data.role === "host") this.#hostRooms.add(data.roomId);

    socket.addEventListener("message", (event) => this.#handleSocketMessage(socket, event.data));
    socket.addEventListener("close", () => this.#untrackSocket(socket));
    socket.addEventListener("error", () => this.#untrackSocket(socket));
  }

  #handleSocketMessage(socket: WebSocket, rawMessage: unknown) {
    const data = this.#socketData.get(socket);
    if (!data || typeof rawMessage !== "string") return;

    if (data.role === "host") {
      const payload = JSON.parse(rawMessage) as {
        type?: string;
        id?: string;
        payload?: string;
        error?: string;
      };
      if (payload.type === "relay.response" && payload.id) {
        const pending = this.#pendingProxyRequests.get(payload.id);
        this.#pendingProxyRequests.delete(payload.id);
        if (payload.payload) {
          pending?.resolve(payload.payload);
        } else {
          pending?.reject(new Error(payload.error ?? "Relay host request failed."));
        }
        return;
      }
    }

    for (const peer of this.#socketsByRoom.get(data.roomId) ?? []) {
      if (peer === socket) continue;
      peer.send(
        JSON.stringify({
          type: "relay.message",
          roomId: data.roomId,
          from: data.clientId,
          payload: rawMessage,
        })
      );
    }
  }

  #untrackSocket(socket: WebSocket) {
    const data = this.#socketData.get(socket);
    if (!data) return;
    const peers = this.#socketsByRoom.get(data.roomId);
    peers?.delete(socket);
    if (peers?.size === 0) this.#socketsByRoom.delete(data.roomId);
    if (data.role === "host") this.#hostRooms.delete(data.roomId);
    this.#socketData.delete(socket);
  }

  #authorizeRelayRoom(
    persistedState: PersistedControlPlaneState,
    roomId: string,
    token: string | null
  ) {
    const machine = persistedState.machines.find((entry) => entry.relayRoomId === roomId);
    return Boolean(machine && token && createRelayAuthToken(machine.relaySecret, machine.relayRoomId) === token);
  }
}

const worker = {
  async fetch(request: Request, env: Env) {
    const id = env.OFFDEX_CONTROL_PLANE.idFromName("global");
    return env.OFFDEX_CONTROL_PLANE.get(id).fetch(request);
  },
};

export default worker;

export function createCloudflareRelayWorker() {
  return {
    fetch: worker.fetch,
    ControlPlaneRoom,
  };
}
