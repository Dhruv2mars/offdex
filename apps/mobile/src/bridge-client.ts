import type { OffdexWorkspaceSnapshot, RuntimeTarget } from "@offdex/protocol";

export interface BridgeHealth {
  ok: boolean;
  transport: string;
  bridgeUrl: string;
  bridgeHints: string[];
  macName: string;
  desktopAvailable: boolean;
  session: {
    pairingCode: string;
    runtimeTarget: RuntimeTarget;
    connectedAt: string;
  } | null;
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

export function toBridgeLiveUrl(baseUrl: string) {
  const normalized = normalizeBridgeBaseUrl(baseUrl);

  if (normalized.startsWith("https://")) {
    return `${normalized.replace("https://", "wss://")}/live`;
  }

  return `${normalized.replace("http://", "ws://")}/live`;
}

export async function fetchBridgeHealth(baseUrl: string) {
  const response = await fetch(`${normalizeBridgeBaseUrl(baseUrl)}/health`);
  if (!response.ok) {
    throw new Error(`Bridge health failed: ${response.status}`);
  }

  return response.json() as Promise<BridgeHealth>;
}

export async function fetchBridgeSnapshot(baseUrl: string) {
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

export function subscribeToBridgeSnapshots(
  baseUrl: string,
  handlers: {
    onSnapshot: (snapshot: OffdexWorkspaceSnapshot) => void;
    onStatusChange?: (status: "open" | "closed" | "error") => void;
  }
) {
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
