import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ServerWebSocket } from "bun";
import {
  createBridgeAccessToken,
  createRelayAuthToken,
  type DeviceCapabilityMatrix,
  type OffdexAccountSession,
  type OffdexConnectionTicket,
  type OffdexMachineRecord,
  type OffdexTrustedDeviceRecord,
  type RuntimeTarget,
} from "@offdex/protocol";

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

export interface ControlPlaneStateStore {
  load(): PersistedControlPlaneState;
  save(state: PersistedControlPlaneState): void;
}

export interface ControlPlaneServerOptions {
  host?: string;
  port?: number;
  publicUrl?: string;
  stateStore?: ControlPlaneStateStore;
  readNetworkInterfaces?: typeof networkInterfaces;
}

interface RelaySocketData {
  roomId: string;
  clientId: string;
  role: "host" | "client";
}

interface PendingProxyRequest {
  resolve: (payload: string) => void;
  reject: (error: Error) => void;
  timer: Timer;
}

function defaultStatePath() {
  return join(homedir(), ".offdex", "control-plane-state.json");
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function resolveReachableHost(
  host: string,
  readNetworkInterfaces: typeof networkInterfaces = networkInterfaces
) {
  if (host !== "0.0.0.0") {
    return host;
  }

  const interfaces = readNetworkInterfaces();
  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family !== "IPv4" || address.internal) {
        continue;
      }

      return address.address;
    }
  }

  return "127.0.0.1";
}

export function resolveControlPlaneBaseUrl(
  host: string,
  port: number,
  readNetworkInterfaces: typeof networkInterfaces = networkInterfaces
) {
  return normalizeBaseUrl(`http://${resolveReachableHost(host, readNetworkInterfaces)}:${port}`);
}

function nowIso() {
  return new Date().toISOString();
}

function plusMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function createControlPlaneStateStore(options?: { path?: string }): ControlPlaneStateStore {
  const path = options?.path ?? process.env.OFFDEX_CONTROL_PLANE_STATE_PATH ?? defaultStatePath();

  return {
    load() {
      if (!existsSync(path)) {
        return {
          machines: [],
          pairingClaims: [],
          sessions: [],
        };
      }

      return JSON.parse(readFileSync(path, "utf8")) as PersistedControlPlaneState;
    },
    save(state) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(state, null, 2));
    },
  };
}

export function createMemoryControlPlaneStateStore(
  initialState: PersistedControlPlaneState = {
    machines: [],
    pairingClaims: [],
    sessions: [],
  }
): ControlPlaneStateStore {
  let memoryState = structuredClone(initialState);

  return {
    load() {
      return structuredClone(memoryState);
    },
    save(state) {
      memoryState = structuredClone(state);
    },
  };
}

function toMachineRecord(
  machine: ControlPlaneMachineState,
  input: {
    controlPlaneUrl: string;
    online: boolean;
  }
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

function makeSession(machine: ControlPlaneMachineState, deviceLabel: string): DeviceSessionState {
  const issuedAt = nowIso();
  return {
    deviceId: randomUUID(),
    deviceLabel,
    ownerId: machine.ownerId,
    ownerLabel: machine.ownerLabel,
    token: randomUUID(),
    issuedAt,
    expiresAt: null,
    trustedAt: issuedAt,
  };
}

export function startControlPlaneServer(options: ControlPlaneServerOptions = {}) {
  const host = options.host ?? "0.0.0.0";
  const port = options.port ?? 42421;
  const stateStore = options.stateStore ?? createControlPlaneStateStore();
  const readNetworkInterfaces = options.readNetworkInterfaces ?? networkInterfaces;
  let persistedState = stateStore.load();
  const hostRooms = new Set<string>();
  const socketsByRoom = new Map<string, Set<ServerWebSocket<RelaySocketData>>>();
  const pendingProxyRequests = new Map<string, PendingProxyRequest>();

  const save = () => {
    stateStore.save(persistedState);
  };

  let resolvedBaseUrl = normalizeBaseUrl(
    options.publicUrl ?? resolveControlPlaneBaseUrl(host, port, readNetworkInterfaces)
  );

  const listMachinesForOwner = (ownerId: string) =>
    persistedState.machines
      .filter((machine) => machine.ownerId === ownerId)
      .sort((left, right) => left.macName.localeCompare(right.macName))
      .map((machine) =>
        toMachineRecord(machine, {
          controlPlaneUrl: resolvedBaseUrl,
          online: hostRooms.has(machine.relayRoomId),
        })
      );

  const readSession = (request: Request) => {
    const header = request.headers.get("authorization")?.trim() ?? "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
    if (!token) {
      return null;
    }

    return persistedState.sessions.find((session) => session.token === token) ?? null;
  };

  const authorizeRelayRoom = (roomId: string, token: string | null) => {
    const machine = persistedState.machines.find((entry) => entry.relayRoomId === roomId);
    if (!machine || !token) {
      return false;
    }

    return createRelayAuthToken(machine.relaySecret, machine.relayRoomId) === token;
  };

  const server = Bun.serve<RelaySocketData>({
    hostname: host,
    port,
    fetch(request: Request, serverRef) {
      const url = new URL(request.url);

      if (url.pathname === "/health") {
        return Response.json({ ok: true, transport: "managed-control-plane" });
      }

      if (url.pathname === "/v1/machines/register" && request.method === "POST") {
        return request.json().then((rawBody) => {
          const body = rawBody as {
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

          if (
            !body.machineId ||
            !body.machineSecret ||
            !body.macName ||
            !body.ownerId ||
            !body.ownerLabel ||
            !body.bridgeUrl
          ) {
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
            capabilityMatrix: {
              mobile: "expo",
              web: "next",
              runtimes: ["cli"],
            },
            relayRoomId:
              existing?.relayRoomId ?? body.relayRoomId ?? randomUUID().replaceAll("-", ""),
            relaySecret: existing?.relaySecret ?? body.machineSecret,
            lastSeenAt: nowIso(),
          };

          persistedState.machines = [
            ...persistedState.machines.filter((machine) => machine.machineId !== nextMachine.machineId),
            nextMachine,
          ];

          const pairing: PairingClaimState = {
            claimCode: randomUUID(),
            machineId: nextMachine.machineId,
            ownerId: nextMachine.ownerId,
            expiresAt: plusMinutes(10),
          };

          persistedState.pairingClaims = [
            ...persistedState.pairingClaims.filter((claim) => claim.machineId !== nextMachine.machineId),
            pairing,
          ];
          save();

          return Response.json({
            machine: {
                ...toMachineRecord(nextMachine, {
                controlPlaneUrl: resolvedBaseUrl,
                online: hostRooms.has(nextMachine.relayRoomId),
              }),
              relay: {
                roomId: nextMachine.relayRoomId,
                secret: nextMachine.relaySecret,
              },
            },
            pairing: {
              claimCode: pairing.claimCode,
              expiresAt: pairing.expiresAt,
            },
          });
        });
      }

      if (url.pathname === "/v1/pairing/claim" && request.method === "POST") {
        return request.json().then((rawBody) => {
          const body = rawBody as {
            claimCode?: string;
            deviceLabel?: string;
          };
          const claim = persistedState.pairingClaims.find((entry) => entry.claimCode === body.claimCode);
          if (!claim || Date.parse(claim.expiresAt) < Date.now()) {
            return Response.json({ error: "Pairing claim expired." }, { status: 404 });
          }

          const machine = persistedState.machines.find((entry) => entry.machineId === claim.machineId);
          if (!machine) {
            return Response.json({ error: "Machine not found." }, { status: 404 });
          }

          const session = makeSession(machine, body.deviceLabel?.trim() || "Offdex phone");
          persistedState.sessions = [
            ...persistedState.sessions.filter((entry) => entry.deviceId !== session.deviceId),
            session,
          ];
          save();

          return Response.json({
            session,
            trustedDevice: {
              deviceId: session.deviceId,
              deviceLabel: session.deviceLabel,
              ownerId: session.ownerId,
              trustedAt: session.trustedAt,
              lastSeenAt: session.issuedAt,
            } satisfies OffdexTrustedDeviceRecord,
            machines: listMachinesForOwner(session.ownerId),
          });
        });
      }

      if (url.pathname === "/v1/machines" && request.method === "GET") {
        const session = readSession(request);
        if (!session) {
          return Response.json({ error: "Unauthorized." }, { status: 401 });
        }

        return Response.json({
          session,
          machines: listMachinesForOwner(session.ownerId),
        });
      }

      if (url.pathname === "/v1/connections/ticket" && request.method === "POST") {
        const session = readSession(request);
        if (!session) {
          return Response.json({ error: "Unauthorized." }, { status: 401 });
        }

        return request.json().then((rawBody) => {
          const body = rawBody as { machineId?: string };
          const machine = persistedState.machines.find((entry) => entry.machineId === body.machineId);
          if (!machine || machine.ownerId !== session.ownerId) {
            return Response.json({ error: "Forbidden." }, { status: 403 });
          }

          const ticketId = randomUUID();
          const expiresAt = plusMinutes(5);
          const ticket: OffdexConnectionTicket = {
            ticketId,
            machineId: machine.machineId,
            ownerId: machine.ownerId,
            transportMode: machine.bridgeHints.length > 0 ? "local" : "relay",
            issuedAt: nowIso(),
            expiresAt,
            local:
              machine.bridgeHints.length > 0
                ? {
                    bridgeUrls: machine.bridgeHints,
                  }
                : null,
            direct: null,
            relay: {
              relayUrl: resolvedBaseUrl,
              roomId: machine.relayRoomId,
              secret: machine.relaySecret,
            },
          };

          return Response.json({ ticket });
        });
      }

      if (url.pathname.startsWith("/proxy/") && request.method === "POST") {
        const roomId = url.pathname.replace("/proxy/", "");
        const token = url.searchParams.get("token")?.trim() ?? null;
        if (!authorizeRelayRoom(roomId, token)) {
          return Response.json({ error: "Unauthorized room access." }, { status: 403 });
        }

        const roomSockets = socketsByRoom.get(roomId) ?? new Set();
        const hostSocket = [...roomSockets].find((socket) => socket.data.role === "host");
        if (!hostSocket) {
          return Response.json({ error: "Host offline." }, { status: 503 });
        }

        return request.json().then((rawBody) => {
          const body = rawBody as { payload?: string };
          if (!body.payload) {
            return Response.json({ error: "Missing payload." }, { status: 400 });
          }

          const requestId = `proxy-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
          return new Promise<Response>((resolve) => {
            const timer = setTimeout(() => {
              pendingProxyRequests.delete(requestId);
              resolve(Response.json({ error: "Host timed out." }, { status: 504 }));
            }, 10_000);

            pendingProxyRequests.set(requestId, {
              resolve(payload) {
                clearTimeout(timer);
                pendingProxyRequests.delete(requestId);
                resolve(Response.json({ payload }));
              },
              reject(error) {
                clearTimeout(timer);
                pendingProxyRequests.delete(requestId);
                resolve(Response.json({ error: error.message }, { status: 502 }));
              },
              timer,
            });

            hostSocket.send(
              JSON.stringify({
                type: "relay.proxy",
                id: requestId,
                payload: body.payload,
              })
            );
          });
        });
      }

      if (url.pathname.startsWith("/ws/")) {
        const roomId = url.pathname.replace("/ws/", "");
        const role = url.searchParams.get("role") === "host" ? "host" : "client";
        const clientId = url.searchParams.get("clientId") || `client-${Date.now()}`;
        const token = url.searchParams.get("token")?.trim() ?? null;

        if (!authorizeRelayRoom(roomId, token)) {
          return Response.json({ error: "Unauthorized room access." }, { status: 403 });
        }

        const upgraded = serverRef.upgrade(request, {
          data: { roomId, clientId, role } satisfies RelaySocketData,
        });
        return upgraded ? undefined : new Response("Upgrade failed", { status: 400 });
      }

      return new Response("Not found", { status: 404 });
    },
    websocket: {
      open(socket) {
        const roomSockets = socketsByRoom.get(socket.data.roomId) ?? new Set();
        roomSockets.add(socket);
        socketsByRoom.set(socket.data.roomId, roomSockets);
        if (socket.data.role === "host") {
          hostRooms.add(socket.data.roomId);
        }
      },
      message(socket, message) {
        const text = typeof message === "string" ? message : Buffer.from(message).toString("utf8");
        if (socket.data.role === "host") {
          const payload = JSON.parse(text) as {
            type?: string;
            id?: string;
            payload?: string;
            error?: string;
          };
          if (payload.type === "relay.response" && payload.id) {
            if (payload.payload) {
              pendingProxyRequests.get(payload.id)?.resolve(payload.payload);
            } else {
              pendingProxyRequests.get(payload.id)?.reject(
                new Error(payload.error ?? "Relay host request failed.")
              );
            }
            return;
          }
        }

        const peers = socketsByRoom.get(socket.data.roomId) ?? new Set();
        for (const peer of peers) {
          if (peer === socket) {
            continue;
          }

          peer.send(
            JSON.stringify({
              type: "relay.message",
              roomId: socket.data.roomId,
              from: socket.data.clientId,
              payload: text,
            })
          );
        }
      },
      close(socket) {
        const peers = socketsByRoom.get(socket.data.roomId);
        peers?.delete(socket);
        if (peers && peers.size === 0) {
          socketsByRoom.delete(socket.data.roomId);
        }
        if (socket.data.role === "host") {
          hostRooms.delete(socket.data.roomId);
        }
      },
    },
  });

  if (!options.publicUrl) {
    resolvedBaseUrl = resolveControlPlaneBaseUrl(host, server.port ?? port, readNetworkInterfaces);
  }

  return {
    server,
    stop() {
      server.stop(true);
      socketsByRoom.clear();
      hostRooms.clear();
      for (const pending of pendingProxyRequests.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error("Control plane stopped."));
      }
      pendingProxyRequests.clear();
    },
  };
}
