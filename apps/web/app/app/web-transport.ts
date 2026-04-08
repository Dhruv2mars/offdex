import nacl from "tweetnacl";
import { decodeUTF8, encodeBase64, decodeBase64, encodeUTF8 } from "tweetnacl-util";

export type RuntimeTarget = "cli" | "desktop";
export type TurnState = "idle" | "running" | "completed" | "failed";
export type ConnectionTransport = "local" | "relay";
export const OFFDEX_NEW_THREAD_ID = "offdex-new-thread";

export type OffdexMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  body: string;
  createdAt: string;
};

export type OffdexThread = {
  id: string;
  title: string;
  projectLabel: string;
  runtimeTarget: RuntimeTarget;
  state: TurnState;
  unreadCount: number;
  updatedAt: string;
  messages: OffdexMessage[];
};

export type OffdexWorkspaceSnapshot = {
  pairing: {
    bridgeUrl: string;
    bridgeHints: string[];
    macName: string;
    state: "unpaired" | "paired" | "reconnecting";
    lastSeenAt: string;
    runtimeTarget: RuntimeTarget;
  };
  capabilityMatrix: {
    mobile: "expo";
    web: "next";
    runtimes: RuntimeTarget[];
  };
  threads: OffdexThread[];
};

export type OffdexRuntimeAccount = {
  id: string | null;
  email: string | null;
  name: string | null;
  planType: string | null;
  isAuthenticated: boolean;
};

export type BridgeHealth = {
  ok?: boolean;
  macName?: string;
  bridgeMode?: string;
  bridgeUrl?: string;
  bridgeHints?: string[];
  codexConnected?: boolean;
  codexAccount?: OffdexRuntimeAccount | null;
  liveClientCount?: number;
  relayConnected?: boolean;
};

type RelayTarget = {
  relayUrl: string;
  roomId: string;
  secret: string;
  bridgeUrl: string;
  macName: string;
};

export type ManagedSession = {
  controlPlaneUrl: string;
  machineId: string;
  token: string;
  ownerId: string;
  ownerLabel: string;
  deviceId: string;
};

type MachineRecord = {
  machineId: string;
  macName: string;
  localBridgeUrl: string;
  directBridgeUrls: string[];
};

type Connection = {
  target: string;
  label: string;
  transport: ConnectionTransport;
};

type PairingPayload = {
  bridgeUrl: string;
  macName: string;
  remote?: {
    controlPlaneUrl: string;
    machineId: string;
    claimCode: string;
    ownerLabel: string;
  };
};

const LOCAL_PROBE_TIMEOUT_MS = 1_500;

export function normalizeBridgeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
}

export function extractPairingUri(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("offdex://pair")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    return parsed.searchParams.get("pair")?.trim() || null;
  } catch {
    return null;
  }
}

function isManagedSession(value: unknown): value is ManagedSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<ManagedSession>;
  return Boolean(
    session.controlPlaneUrl &&
      session.machineId &&
      session.token &&
      session.ownerId &&
      session.ownerLabel &&
      session.deviceId
  );
}

export function serializeManagedSession(session: ManagedSession) {
  return JSON.stringify({
    controlPlaneUrl: session.controlPlaneUrl,
    machineId: session.machineId,
    token: session.token,
    ownerId: session.ownerId,
    ownerLabel: session.ownerLabel,
    deviceId: session.deviceId,
  });
}

export function parseManagedSession(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return isManagedSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function toBase64Url(value: string) {
  return value.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBase64(value: string) {
  const paddingLength = value.length % 4 === 0 ? 0 : 4 - (value.length % 4);
  return value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat(paddingLength);
}

function createRelayAuthToken(secret: string, roomId: string) {
  return toBase64Url(
    encodeBase64(nacl.hash(decodeUTF8(`offdex:relay:${roomId}:${secret}`)))
  );
}

function deriveRelayKey(secret: string) {
  return nacl.hash(decodeUTF8(secret)).slice(0, nacl.secretbox.keyLength);
}

function encryptRelayPayload(secret: string, value: unknown) {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const ciphertext = nacl.secretbox(
    decodeUTF8(JSON.stringify(value)),
    nonce,
    deriveRelayKey(secret)
  );
  return {
    nonce: toBase64Url(encodeBase64(nonce)),
    ciphertext: toBase64Url(encodeBase64(ciphertext)),
  };
}

function decryptRelayPayload<T>(secret: string, payload: { nonce: string; ciphertext: string }) {
  const decrypted = nacl.secretbox.open(
    decodeBase64(base64UrlToBase64(payload.ciphertext)),
    decodeBase64(base64UrlToBase64(payload.nonce)),
    deriveRelayKey(secret)
  );
  if (!decrypted) throw new Error("Invalid Offdex relay payload.");
  return JSON.parse(encodeUTF8(decrypted)) as T;
}

function normalizeRelayUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function toRelayProxyUrl(relayUrl: string, roomId: string) {
  const normalized = normalizeRelayUrl(relayUrl);
  const suffix = `/proxy/${roomId}`;
  if (normalized.startsWith("wss://")) return `${normalized.replace("wss://", "https://")}${suffix}`;
  if (normalized.startsWith("ws://")) return `${normalized.replace("ws://", "http://")}${suffix}`;
  return `${normalized}${suffix}`;
}

function toRelayLiveUrl(relayUrl: string, roomId: string) {
  const normalized = normalizeRelayUrl(relayUrl);
  const wsBase = normalized.startsWith("https://")
    ? normalized.replace("https://", "wss://")
    : normalized.startsWith("http://")
      ? normalized.replace("http://", "ws://")
      : normalized;
  return `${wsBase}/ws/${roomId}`;
}

function encodeRelayConnectionTarget(target: RelayTarget) {
  const search = new URLSearchParams({
    bridge: target.bridgeUrl,
    name: target.macName,
    relay: target.relayUrl,
    room: target.roomId,
    secret: target.secret,
    v: "2",
  });
  return `offdex-relay://connect?${search.toString()}`;
}

function decodeRelayConnectionTarget(value: string): RelayTarget | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "offdex-relay:" || parsed.hostname !== "connect") return null;
  const bridgeUrl = parsed.searchParams.get("bridge")?.trim();
  const macName = parsed.searchParams.get("name")?.trim();
  const relayUrl = parsed.searchParams.get("relay")?.trim();
  const roomId = parsed.searchParams.get("room")?.trim();
  const secret = parsed.searchParams.get("secret")?.trim();
  if (!bridgeUrl || !macName || !relayUrl || !roomId || !secret) return null;
  return { bridgeUrl, macName, relayUrl, roomId, secret };
}

export function decodePairingPayload(value: string): PairingPayload | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "offdex:" || parsed.hostname !== "pair") return null;
  const bridgeUrl = parsed.searchParams.get("bridge")?.trim();
  const macName = parsed.searchParams.get("name")?.trim();
  const version = parsed.searchParams.get("v");
  if (!bridgeUrl || !macName) return null;
  if (version !== "3") return { bridgeUrl, macName };
  const controlPlaneUrl = parsed.searchParams.get("control")?.trim();
  const machineId = parsed.searchParams.get("machine")?.trim();
  const claimCode = parsed.searchParams.get("claim")?.trim();
  const ownerLabel = parsed.searchParams.get("owner")?.trim();
  if (!controlPlaneUrl || !machineId || !claimCode || !ownerLabel) return null;
  return {
    bridgeUrl,
    macName,
    remote: { controlPlaneUrl, machineId, claimCode, ownerLabel },
  };
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim());
  return response.json() as Promise<T>;
}

async function fetchWithTimeout(input: string, init?: RequestInit, timeoutMs = LOCAL_PROBE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function sendRelayRequest<T>(
  target: RelayTarget,
  request: { id: string; action: "health" | "snapshot" | "turn"; threadId?: string; body?: string }
) {
  const proxyUrl = new URL(toRelayProxyUrl(target.relayUrl, target.roomId));
  proxyUrl.searchParams.set("token", createRelayAuthToken(target.secret, target.roomId));
  const response = await fetch(proxyUrl.toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      payload: JSON.stringify(encryptRelayPayload(target.secret, request)),
    }),
  });
  if (!response.ok) throw new Error(`Remote relay failed: ${response.status}`);
  const payload = (await response.json()) as { payload: string };
  return decryptRelayPayload<T>(target.secret, JSON.parse(payload.payload));
}

export function liveUrlForConnection(target: string) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    const url = new URL(toRelayLiveUrl(relayTarget.relayUrl, relayTarget.roomId));
    url.searchParams.set("role", "client");
    url.searchParams.set("clientId", `web-${Date.now()}`);
    url.searchParams.set("token", createRelayAuthToken(relayTarget.secret, relayTarget.roomId));
    return url.toString();
  }
  const url = new URL(target);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/live";
  url.search = "";
  return url.toString();
}

export function readLiveSnapshotMessage(target: string, data: string) {
  const payload = JSON.parse(data) as {
    type?: string;
    payload?: string;
    data?: OffdexWorkspaceSnapshot;
  };
  if (payload.type === "workspace.snapshot" && payload.data) {
    return payload.data;
  }

  const relayTarget = decodeRelayConnectionTarget(target);
  if (!relayTarget || payload.type !== "relay.message" || !payload.payload) {
    return null;
  }

  const relayed = decryptRelayPayload<{ type?: string; data?: OffdexWorkspaceSnapshot }>(
    relayTarget.secret,
    JSON.parse(payload.payload)
  );
  return relayed.type === "workspace.snapshot" && relayed.data ? relayed.data : null;
}

export async function fetchBridgeHealth(target: string) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<BridgeHealth>(relayTarget, {
      id: `health-${Date.now()}`,
      action: "health",
    });
  }
  return fetchJson<BridgeHealth>(`${target}/health`);
}

export async function fetchBridgeSnapshot(target: string) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<OffdexWorkspaceSnapshot>(relayTarget, {
      id: `snapshot-${Date.now()}`,
      action: "snapshot",
    });
  }
  return fetchJson<OffdexWorkspaceSnapshot>(`${target}/snapshot`);
}

export async function sendBridgeTurn(target: string, threadId: string, body: string) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ snapshot: OffdexWorkspaceSnapshot }>(relayTarget, {
      id: `turn-${Date.now()}`,
      action: "turn",
      threadId,
      body,
    });
  }
  return fetchJson<{ snapshot: OffdexWorkspaceSnapshot }>(`${target}/turn`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ threadId, body }),
  });
}

export async function claimPairing(pairingUri: string) {
  const pairing = decodePairingPayload(pairingUri);
  if (!pairing?.remote) return null;
  const response = await fetchJson<{
    session: ManagedSession;
    machines: MachineRecord[];
  }>(`${pairing.remote.controlPlaneUrl.replace(/\/+$/, "")}/v1/pairing/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      claimCode: pairing.remote.claimCode,
      deviceLabel: "Offdex web",
    }),
  });
  return {
    session: {
      ...response.session,
      controlPlaneUrl: pairing.remote.controlPlaneUrl,
      machineId: pairing.remote.machineId,
    },
    machines: response.machines,
  };
}

export async function resolveManagedConnection(session: ManagedSession): Promise<Connection> {
  const ticketPayload = await fetchJson<{
    ticket: {
      local: { bridgeUrls: string[] } | null;
      relay: { relayUrl: string; roomId: string; secret: string } | null;
    };
  }>(`${session.controlPlaneUrl.replace(/\/+$/, "")}/v1/connections/ticket`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({ machineId: session.machineId }),
  });
  const machinesPayload = await fetchJson<{ machines: MachineRecord[] }>(
    `${session.controlPlaneUrl.replace(/\/+$/, "")}/v1/machines`,
    { headers: { authorization: `Bearer ${session.token}` } }
  );
  const machine = machinesPayload.machines.find((entry) => entry.machineId === session.machineId);
  const localUrls = [
    ...(ticketPayload.ticket.local?.bridgeUrls ?? []),
    ...(machine?.directBridgeUrls ?? []),
    machine?.localBridgeUrl,
  ].filter((url): url is string => Boolean(url));

  for (const url of [...new Set(localUrls)]) {
    const target = normalizeBridgeUrl(url);
    try {
      const response = await fetchWithTimeout(`${target}/health`);
      if (response.ok) {
        return { target, label: machine?.macName ?? session.ownerLabel, transport: "local" };
      }
    } catch {}
  }

  if (!ticketPayload.ticket.relay) throw new Error("Machine is offline.");
  return {
    target: encodeRelayConnectionTarget({
      bridgeUrl: machine?.localBridgeUrl ?? "http://127.0.0.1:42420",
      macName: machine?.macName ?? session.ownerLabel,
      relayUrl: ticketPayload.ticket.relay.relayUrl,
      roomId: ticketPayload.ticket.relay.roomId,
      secret: ticketPayload.ticket.relay.secret,
    }),
    label: machine?.macName ?? session.ownerLabel,
    transport: "relay",
  };
}
