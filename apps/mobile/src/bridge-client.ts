import {
  createRelayAuthToken,
  decryptRelayPayload,
  encryptRelayPayload,
  type OffdexPairingPayload,
  type OffdexWorkspaceSnapshot,
  type RuntimeTarget,
} from "@offdex/protocol";

export interface BridgeHealth {
  ok: boolean;
  transport: string;
  bridgeUrl: string;
  bridgeHints: string[];
  macName: string;
  desktopAvailable: boolean;
  relayConnected?: boolean;
  relayUrl?: string | null;
  session: {
    pairingCode: string;
    runtimeTarget: RuntimeTarget;
    connectedAt: string;
  } | null;
}

interface RelayConnectionTarget {
  bridgeUrl: string;
  macName: string;
  relay: {
    relayUrl: string;
    roomId: string;
    secret: string;
  };
  version: 2;
}

interface RelayBridgeRequest {
  id: string;
  action: "health" | "snapshot" | "runtime" | "turn" | "interrupt";
  preferredTarget?: RuntimeTarget;
  threadId?: string;
  body?: string;
}

const relaySubscribers = new Map<string, RelayLiveSubscription>();

function normalizeRelayUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function toRelayWebSocketUrl(relayUrl: string) {
  const normalized = normalizeRelayUrl(relayUrl);

  if (normalized.startsWith("https://")) {
    return normalized.replace("https://", "wss://");
  }

  if (normalized.startsWith("http://")) {
    return normalized.replace("http://", "ws://");
  }

  return normalized;
}

function toRelayProxyUrl(relayUrl: string, roomId: string) {
  const normalized = normalizeRelayUrl(relayUrl);
  const suffix = `/proxy/${roomId}`;

  if (normalized.startsWith("wss://")) {
    return `${normalized.replace("wss://", "https://")}${suffix}`;
  }

  if (normalized.startsWith("ws://")) {
    return `${normalized.replace("ws://", "http://")}${suffix}`;
  }

  return `${normalized}${suffix}`;
}

function toRelayLiveWsUrl(relayUrl: string, roomId: string) {
  return `${toRelayWebSocketUrl(relayUrl)}/ws/${roomId}`;
}

function createRelayRoomToken(target: RelayConnectionTarget) {
  return createRelayAuthToken(target.relay.secret, target.relay.roomId);
}

function nextRequestId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function normalizeBridgeBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "http://127.0.0.1:42420";
  }

  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed.replace(/\/+$/, "")
    : `http://${trimmed.replace(/\/+$/, "")}`;
}

export function encodeRelayConnectionTarget(payload: OffdexPairingPayload) {
  if (!payload.relay || payload.version !== 2) {
    throw new Error("Relay pairing is not enabled for this target.");
  }

  const search = new URLSearchParams({
    bridge: payload.bridgeUrl,
    name: payload.macName,
    relay: payload.relay.relayUrl,
    room: payload.relay.roomId,
    secret: payload.relay.secret,
    v: "2",
  });

  return `offdex-relay://connect?${search.toString()}`;
}

export function decodeRelayConnectionTarget(value: string) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (parsed.protocol !== "offdex-relay:" || parsed.hostname !== "connect") {
    return null;
  }

  const bridgeUrl = parsed.searchParams.get("bridge")?.trim();
  const macName = parsed.searchParams.get("name")?.trim();
  const relayUrl = parsed.searchParams.get("relay")?.trim();
  const roomId = parsed.searchParams.get("room")?.trim();
  const secret = parsed.searchParams.get("secret")?.trim();
  const version = parsed.searchParams.get("v");

  if (!bridgeUrl || !macName || !relayUrl || !roomId || !secret || version !== "2") {
    return null;
  }

  return {
    bridgeUrl,
    macName,
    relay: {
      relayUrl,
      roomId,
      secret,
    },
    version: 2,
  } satisfies RelayConnectionTarget;
}

export function toBridgeLiveUrl(baseUrl: string) {
  const relayTarget = decodeRelayConnectionTarget(baseUrl);
  if (relayTarget) {
    return `${toRelayLiveWsUrl(relayTarget.relay.relayUrl, relayTarget.relay.roomId)}?role=client&clientId=${nextRequestId("mobile")}&token=${createRelayRoomToken(relayTarget)}`;
  }

  const normalized = normalizeBridgeBaseUrl(baseUrl);

  if (normalized.startsWith("https://")) {
    return `${normalized.replace("https://", "wss://")}/live`;
  }

  return `${normalized.replace("http://", "ws://")}/live`;
}

async function sendRelayProxyRequest<T>(
  target: RelayConnectionTarget,
  request: RelayBridgeRequest
) {
  const proxyUrl = new URL(toRelayProxyUrl(target.relay.relayUrl, target.relay.roomId));
  proxyUrl.searchParams.set("token", createRelayRoomToken(target));

  const response = await fetch(proxyUrl.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      payload: JSON.stringify(encryptRelayPayload(target.relay.secret, request)),
    }),
  });

  if (!response.ok) {
    throw new Error(`Relay request failed: ${response.status}`);
  }

  const payload = (await response.json()) as { payload: string };
  return decryptRelayPayload<T>(target.relay.secret, JSON.parse(payload.payload));
}

class RelayLiveSubscription {
  #target: RelayConnectionTarget;
  #socket: WebSocket | null = null;
  #reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  #listeners = new Set<{
    onSnapshot: (snapshot: OffdexWorkspaceSnapshot) => void;
    onStatusChange?: (status: "open" | "closed" | "error") => void;
  }>();

  constructor(target: RelayConnectionTarget) {
    this.#target = target;
  }

  subscribe(listener: {
    onSnapshot: (snapshot: OffdexWorkspaceSnapshot) => void;
    onStatusChange?: (status: "open" | "closed" | "error") => void;
  }) {
    this.#listeners.add(listener);
    this.#ensureSocket();

    return () => {
      this.#listeners.delete(listener);
      if (this.#listeners.size === 0) {
        this.dispose();
      }
    };
  }

  dispose() {
    if (this.#reconnectTimer) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }

    this.#socket?.close();
    this.#socket = null;
  }

  #ensureSocket() {
    if (this.#socket && this.#socket.readyState <= WebSocket.OPEN) {
      return;
    }

    const socket = new WebSocket(
      `${toRelayLiveWsUrl(this.#target.relay.relayUrl, this.#target.relay.roomId)}?role=client&clientId=${nextRequestId("mobile")}&token=${createRelayRoomToken(this.#target)}`
    );
    this.#socket = socket;

    socket.onopen = () => {
      for (const listener of this.#listeners) {
        listener.onStatusChange?.("open");
      }
    };

    socket.onmessage = (event) => {
      if (typeof event.data !== "string") {
        return;
      }

      const envelope = JSON.parse(event.data) as {
        type?: string;
        payload?: string;
      };

      if (envelope.type !== "relay.message" || !envelope.payload) {
        return;
      }

      const payload = decryptRelayPayload<{ type?: string; data?: OffdexWorkspaceSnapshot }>(
        this.#target.relay.secret,
        JSON.parse(envelope.payload)
      );

      if (payload.type !== "workspace.snapshot" || !payload.data) {
        return;
      }

      for (const listener of this.#listeners) {
        listener.onSnapshot(payload.data);
      }
    };

    socket.onerror = () => {
      for (const listener of this.#listeners) {
        listener.onStatusChange?.("error");
      }
    };

    socket.onclose = () => {
      for (const listener of this.#listeners) {
        listener.onStatusChange?.("closed");
      }

      this.#socket = null;
      if (this.#listeners.size === 0 || this.#reconnectTimer) {
        return;
      }

      this.#reconnectTimer = setTimeout(() => {
        this.#reconnectTimer = null;
        this.#ensureSocket();
      }, 2_000);
    };
  }
}

function getRelaySubscription(baseUrl: string) {
  const target = decodeRelayConnectionTarget(baseUrl);
  if (!target) {
    return null;
  }

  const key = encodeRelayConnectionTarget(target);
  const existing = relaySubscribers.get(key);
  if (existing) {
    return existing;
  }

  const subscription = new RelayLiveSubscription(target);
  relaySubscribers.set(key, subscription);
  return subscription;
}

export async function fetchBridgeHealth(baseUrl: string) {
  const relayTarget = decodeRelayConnectionTarget(baseUrl);
  if (relayTarget) {
    return sendRelayProxyRequest<BridgeHealth>(relayTarget, {
      id: nextRequestId("health"),
      action: "health",
    });
  }

  const response = await fetch(`${normalizeBridgeBaseUrl(baseUrl)}/health`);
  if (!response.ok) {
    throw new Error(`Bridge health failed: ${response.status}`);
  }

  return response.json() as Promise<BridgeHealth>;
}

export async function fetchBridgeSnapshot(baseUrl: string) {
  const relayTarget = decodeRelayConnectionTarget(baseUrl);
  if (relayTarget) {
    return sendRelayProxyRequest<OffdexWorkspaceSnapshot>(relayTarget, {
      id: nextRequestId("snapshot"),
      action: "snapshot",
    });
  }

  const response = await fetch(`${normalizeBridgeBaseUrl(baseUrl)}/snapshot`);
  if (!response.ok) {
    throw new Error(`Bridge snapshot failed: ${response.status}`);
  }

  return response.json() as Promise<OffdexWorkspaceSnapshot>;
}

export async function selectBridgeRuntime(
  baseUrl: string,
  preferredTarget: RuntimeTarget
) {
  const relayTarget = decodeRelayConnectionTarget(baseUrl);
  if (relayTarget) {
    const payload = await sendRelayProxyRequest<{
      snapshot: OffdexWorkspaceSnapshot;
    }>(relayTarget, {
      id: nextRequestId("runtime"),
      action: "runtime",
      preferredTarget,
    });
    return payload;
  }

  const response = await fetch(`${normalizeBridgeBaseUrl(baseUrl)}/runtime`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ preferredTarget }),
  });

  if (!response.ok) {
    throw new Error(`Bridge runtime switch failed: ${response.status}`);
  }

  return response.json() as Promise<{
    snapshot: OffdexWorkspaceSnapshot;
  }>;
}

export async function sendBridgeTurn(
  baseUrl: string,
  threadId: string,
  body: string
) {
  const relayTarget = decodeRelayConnectionTarget(baseUrl);
  if (relayTarget) {
    const payload = await sendRelayProxyRequest<{
      snapshot: OffdexWorkspaceSnapshot;
    }>(relayTarget, {
      id: nextRequestId("turn"),
      action: "turn",
      threadId,
      body,
    });
    return payload;
  }

  const response = await fetch(`${normalizeBridgeBaseUrl(baseUrl)}/turn`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ threadId, body }),
  });

  if (!response.ok) {
    throw new Error(`Bridge turn failed: ${response.status}`);
  }

  return response.json() as Promise<{
    snapshot: OffdexWorkspaceSnapshot;
  }>;
}

export async function interruptBridgeTurn(baseUrl: string, threadId: string) {
  const relayTarget = decodeRelayConnectionTarget(baseUrl);
  if (relayTarget) {
    const payload = await sendRelayProxyRequest<{
      snapshot: OffdexWorkspaceSnapshot;
    }>(relayTarget, {
      id: nextRequestId("interrupt"),
      action: "interrupt",
      threadId,
    });
    return payload;
  }

  const response = await fetch(`${normalizeBridgeBaseUrl(baseUrl)}/interrupt`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ threadId }),
  });

  if (!response.ok) {
    throw new Error(`Bridge interrupt failed: ${response.status}`);
  }

  return response.json() as Promise<{
    snapshot: OffdexWorkspaceSnapshot;
  }>;
}

export function subscribeToBridgeSnapshots(
  baseUrl: string,
  handlers: {
    onSnapshot: (snapshot: OffdexWorkspaceSnapshot) => void;
    onStatusChange?: (status: "open" | "closed" | "error") => void;
  }
) {
  const relaySubscription = getRelaySubscription(baseUrl);
  if (relaySubscription) {
    return relaySubscription.subscribe(handlers);
  }

  const socket = new WebSocket(toBridgeLiveUrl(baseUrl));

  socket.onopen = () => {
    handlers.onStatusChange?.("open");
  };

  socket.onmessage = (event) => {
    if (typeof event.data !== "string") {
      return;
    }

    const payload = JSON.parse(event.data) as {
      type?: string;
      data?: OffdexWorkspaceSnapshot;
    };

    if (payload.type === "workspace.snapshot" && payload.data) {
      handlers.onSnapshot(payload.data);
    }
  };

  socket.onerror = () => {
    handlers.onStatusChange?.("error");
  };

  socket.onclose = () => {
    handlers.onStatusChange?.("closed");
  };

  return () => {
    socket.close();
  };
}
