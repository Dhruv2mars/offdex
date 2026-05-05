import nacl from "tweetnacl";
import { decodeUTF8, encodeBase64, decodeBase64, encodeUTF8 } from "tweetnacl-util";
import {
  OFFDEX_NEW_THREAD_ID as PROTOCOL_OFFDEX_NEW_THREAD_ID,
  type OffdexAccountLoginSession,
  type OffdexInputItem,
  type OffdexRemoteFileEntry,
  type OffdexRemoteFileMatch,
  type OffdexRemoteDiff,
  type RuntimeTarget,
  type OffdexApprovalRequest,
  type OffdexRuntimeAccount,
  type OffdexWorkbenchInventory,
  type OffdexWorkspaceSnapshot,
} from "@offdex/protocol";
export const OFFDEX_NEW_THREAD_ID = PROTOCOL_OFFDEX_NEW_THREAD_ID;
export type {
  OffdexAccountLoginSession,
  OffdexAppRecord,
  RuntimeTarget,
  OffdexAutomationRecord,
  OffdexApprovalRequest,
  OffdexConfigSummary,
  OffdexExperimentalFeatureRecord,
  OffdexInputItem,
  OffdexMcpServerRecord,
  OffdexModelRecord,
  OffdexPermissionReview,
  OffdexPluginRecord,
  OffdexRateLimitsSummary,
  OffdexRemoteFileEntry,
  OffdexRemoteFileMatch,
  OffdexRemoteDiff,
  OffdexRuntimeAccount,
  OffdexSkillRecord,
  OffdexThread,
  OffdexTimelineItem,
  OffdexTurn,
  OffdexWorkbenchInventory,
  OffdexWorkspaceSnapshot,
} from "@offdex/protocol";

export type ConnectionTransport = "local" | "relay";

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
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`.trim();
    try {
      const payload = (await response.json()) as { error?: unknown };
      if (typeof payload.error === "string" && payload.error.trim()) {
        message = payload.error.trim();
      }
    } catch {}
    throw new Error(message);
  }
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
  request:
    | { id: string; action: "health" | "snapshot" | "inventory" | "account/logout" }
    | { id: string; action: "account/login/start"; type?: "chatgpt" }
    | { id: string; action: "account/login/cancel"; loginId: string }
    | { id: string; action: "config/write"; keyPath: string; value: unknown; filePath?: string | null }
    | { id: string; action: "config/batchWrite"; edits: Array<{ keyPath: string; value: unknown }>; filePath?: string | null }
    | { id: string; action: "experimental-feature/set"; name: string; enabled: boolean }
    | { id: string; action: "skills/config/write"; name?: string | null; path?: string | null; enabled: boolean }
    | { id: string; action: "plugin/install"; marketplacePath: string; pluginName: string }
    | { id: string; action: "plugin/uninstall"; pluginId: string }
    | { id: string; action: "git/diff-remote"; cwd?: string | null }
    | { id: string; action: "files/list"; path: string }
    | { id: string; action: "files/search"; query: string; roots: string[] }
    | { id: string; action: "runtime"; preferredTarget: RuntimeTarget }
    | { id: string; action: "turn"; threadId?: string; body?: string; inputs?: OffdexInputItem[] }
    | { id: string; action: "turn/steer"; threadId: string; body: string; inputs?: OffdexInputItem[] }
    | { id: string; action: "interrupt"; threadId?: string }
    | { id: string; action: "thread/rename"; threadId: string; name: string }
    | { id: string; action: "thread/fork"; threadId: string }
    | { id: string; action: "thread/archive"; threadId: string }
    | { id: string; action: "thread/unarchive"; threadId: string }
    | { id: string; action: "thread/compact"; threadId: string }
    | { id: string; action: "thread/rollback"; threadId: string; numTurns: number }
    | { id: string; action: "review/start"; threadId: string }
    | { id: string; action: "mcp/oauth/login"; name: string }
    | {
        id: string;
        action: "approval";
        approvalId: string;
        approve: boolean;
        answers?: Record<string, string>;
      }
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

export async function fetchBridgeInventory(target: string) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<OffdexWorkbenchInventory>(relayTarget, {
      id: `inventory-${Date.now()}`,
      action: "inventory",
    });
  }
  return fetchJson<OffdexWorkbenchInventory>(`${target}/inventory`);
}

export async function sendBridgeAccountLoginStart(target: string, type: "chatgpt" = "chatgpt") {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ session: OffdexAccountLoginSession }>(relayTarget, {
      id: `account-login-start-${Date.now()}`,
      action: "account/login/start",
      type,
    });
  }
  return fetchJson<{ session: OffdexAccountLoginSession }>(`${target}/account/login/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type }),
  });
}

export async function sendBridgeAccountLoginCancel(target: string, loginId: string) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ ok: true }>(relayTarget, {
      id: `account-login-cancel-${Date.now()}`,
      action: "account/login/cancel",
      loginId,
    });
  }
  return fetchJson<{ ok: true }>(`${target}/account/login/cancel`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ loginId }),
  });
}

export async function sendBridgeAccountLogout(target: string) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ snapshot: OffdexWorkspaceSnapshot }>(relayTarget, {
      id: `account-logout-${Date.now()}`,
      action: "account/logout",
    });
  }
  return fetchJson<{ snapshot: OffdexWorkspaceSnapshot }>(`${target}/account/logout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
  });
}

export async function sendBridgeConfigWrite(
  target: string,
  input: { keyPath: string; value: unknown; filePath?: string | null }
) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ inventory: OffdexWorkbenchInventory }>(relayTarget, {
      id: `config-write-${Date.now()}`,
      action: "config/write",
      keyPath: input.keyPath,
      value: input.value,
      filePath: input.filePath ?? null,
    });
  }
  return fetchJson<{ inventory: OffdexWorkbenchInventory }>(`${target}/config`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function sendBridgeConfigBatchWrite(
  target: string,
  input: { edits: Array<{ keyPath: string; value: unknown }>; filePath?: string | null }
) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ inventory: OffdexWorkbenchInventory }>(relayTarget, {
      id: `config-batch-write-${Date.now()}`,
      action: "config/batchWrite",
      edits: input.edits,
      filePath: input.filePath ?? null,
    });
  }
  return fetchJson<{ inventory: OffdexWorkbenchInventory }>(`${target}/config/batch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function sendBridgeExperimentalFeatureSet(target: string, name: string, enabled: boolean) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ inventory: OffdexWorkbenchInventory }>(relayTarget, {
      id: `experimental-feature-${Date.now()}`,
      action: "experimental-feature/set",
      name,
      enabled,
    });
  }
  return fetchJson<{ inventory: OffdexWorkbenchInventory }>(`${target}/experimental-features`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, enabled }),
  });
}

export async function sendBridgeSkillConfigWrite(
  target: string,
  input: { name?: string | null; path?: string | null; enabled: boolean }
) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ inventory: OffdexWorkbenchInventory }>(relayTarget, {
      id: `skills-write-${Date.now()}`,
      action: "skills/config/write",
      name: input.name ?? null,
      path: input.path ?? null,
      enabled: input.enabled,
    });
  }
  return fetchJson<{ inventory: OffdexWorkbenchInventory }>(`${target}/skills`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function sendBridgePluginInstall(
  target: string,
  input: { marketplacePath: string; pluginName: string }
) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ inventory: OffdexWorkbenchInventory }>(relayTarget, {
      id: `plugin-install-${Date.now()}`,
      action: "plugin/install",
      marketplacePath: input.marketplacePath,
      pluginName: input.pluginName,
    });
  }
  return fetchJson<{ inventory: OffdexWorkbenchInventory }>(`${target}/plugin/install`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function sendBridgePluginUninstall(target: string, pluginId: string) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ inventory: OffdexWorkbenchInventory }>(relayTarget, {
      id: `plugin-uninstall-${Date.now()}`,
      action: "plugin/uninstall",
      pluginId,
    });
  }
  return fetchJson<{ inventory: OffdexWorkbenchInventory }>(`${target}/plugin/uninstall`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pluginId }),
  });
}

export async function fetchBridgeFiles(target: string, path: string) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ entries: OffdexRemoteFileEntry[] }>(relayTarget, {
      id: `files-${Date.now()}`,
      action: "files/list",
      path,
    });
  }
  const url = new URL(`${target}/files`);
  url.searchParams.set("path", path);
  return fetchJson<{ entries: OffdexRemoteFileEntry[] }>(url.toString());
}

export async function searchBridgeFiles(target: string, query: string, roots: string[]) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ files: OffdexRemoteFileMatch[] }>(relayTarget, {
      id: `file-search-${Date.now()}`,
      action: "files/search",
      query,
      roots,
    });
  }
  const url = new URL(`${target}/file-search`);
  url.searchParams.set("query", query);
  for (const root of roots) {
    url.searchParams.append("root", root);
  }
  return fetchJson<{ files: OffdexRemoteFileMatch[] }>(url.toString());
}

export async function fetchBridgeGitDiffRemote(target: string, cwd: string) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<OffdexRemoteDiff>(relayTarget, {
      id: `git-diff-remote-${Date.now()}`,
      action: "git/diff-remote",
      cwd,
    });
  }
  const url = new URL(`${target}/git/diff-remote`);
  url.searchParams.set("cwd", cwd);
  return fetchJson<OffdexRemoteDiff>(url.toString());
}

export async function sendBridgeRuntime(target: string, preferredTarget: RuntimeTarget) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ snapshot: OffdexWorkspaceSnapshot }>(relayTarget, {
      id: `runtime-${Date.now()}`,
      action: "runtime",
      preferredTarget,
    });
  }
  return fetchJson<{ snapshot: OffdexWorkspaceSnapshot }>(`${target}/runtime`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ preferredTarget }),
  });
}

export async function sendBridgeTurn(
  target: string,
  threadId: string,
  body: string,
  inputs?: OffdexInputItem[]
) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ snapshot: OffdexWorkspaceSnapshot }>(relayTarget, {
      id: `turn-${Date.now()}`,
      action: "turn",
      threadId,
      body,
      inputs,
    });
  }
  return fetchJson<{ snapshot: OffdexWorkspaceSnapshot }>(`${target}/turn`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ threadId, body, inputs }),
  });
}

export async function sendBridgeSteer(
  target: string,
  threadId: string,
  body: string,
  inputs?: OffdexInputItem[]
) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ snapshot: OffdexWorkspaceSnapshot }>(relayTarget, {
      id: `turn-steer-${Date.now()}`,
      action: "turn/steer",
      threadId,
      body,
      inputs,
    });
  }
  return fetchJson<{ snapshot: OffdexWorkspaceSnapshot }>(`${target}/turn/steer`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ threadId, body, inputs }),
  });
}

export async function sendBridgeInterrupt(target: string, threadId: string) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ snapshot: OffdexWorkspaceSnapshot }>(relayTarget, {
      id: `interrupt-${Date.now()}`,
      action: "interrupt",
      threadId,
    });
  }
  return fetchJson<{ snapshot: OffdexWorkspaceSnapshot }>(`${target}/interrupt`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ threadId }),
  });
}

export async function sendBridgeApproval(
  target: string,
  approval: Pick<OffdexApprovalRequest, "id">,
  input: { approve: boolean; answers?: Record<string, string> }
) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ snapshot: OffdexWorkspaceSnapshot }>(relayTarget, {
      id: `approval-${Date.now()}`,
      action: "approval",
      approvalId: approval.id,
      approve: input.approve,
      answers: input.answers,
    });
  }
  return fetchJson<{ snapshot: OffdexWorkspaceSnapshot }>(`${target}/approval`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      approvalId: approval.id,
      approve: input.approve,
      answers: input.answers,
    }),
  });
}

export async function sendBridgeThreadRename(target: string, threadId: string, name: string) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ snapshot: OffdexWorkspaceSnapshot }>(relayTarget, {
      id: `thread-rename-${Date.now()}`,
      action: "thread/rename",
      threadId,
      name,
    });
  }
  return fetchJson<{ snapshot: OffdexWorkspaceSnapshot }>(`${target}/thread/rename`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ threadId, name }),
  });
}

export async function sendBridgeThreadFork(target: string, threadId: string) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ snapshot: OffdexWorkspaceSnapshot }>(relayTarget, {
      id: `thread-fork-${Date.now()}`,
      action: "thread/fork",
      threadId,
    });
  }
  return fetchJson<{ snapshot: OffdexWorkspaceSnapshot }>(`${target}/thread/fork`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ threadId }),
  });
}

export async function sendBridgeThreadArchive(target: string, threadId: string) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ snapshot: OffdexWorkspaceSnapshot }>(relayTarget, {
      id: `thread-archive-${Date.now()}`,
      action: "thread/archive",
      threadId,
    });
  }
  return fetchJson<{ snapshot: OffdexWorkspaceSnapshot }>(`${target}/thread/archive`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ threadId }),
  });
}

export async function sendBridgeThreadUnarchive(target: string, threadId: string) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ snapshot: OffdexWorkspaceSnapshot }>(relayTarget, {
      id: `thread-unarchive-${Date.now()}`,
      action: "thread/unarchive",
      threadId,
    });
  }
  return fetchJson<{ snapshot: OffdexWorkspaceSnapshot }>(`${target}/thread/unarchive`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ threadId }),
  });
}

export async function sendBridgeThreadCompact(target: string, threadId: string) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ snapshot: OffdexWorkspaceSnapshot }>(relayTarget, {
      id: `thread-compact-${Date.now()}`,
      action: "thread/compact",
      threadId,
    });
  }
  return fetchJson<{ snapshot: OffdexWorkspaceSnapshot }>(`${target}/thread/compact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ threadId }),
  });
}

export async function sendBridgeThreadRollback(target: string, threadId: string, numTurns: number) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ snapshot: OffdexWorkspaceSnapshot }>(relayTarget, {
      id: `thread-rollback-${Date.now()}`,
      action: "thread/rollback",
      threadId,
      numTurns,
    });
  }
  return fetchJson<{ snapshot: OffdexWorkspaceSnapshot }>(`${target}/thread/rollback`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ threadId, numTurns }),
  });
}

export async function sendBridgeReview(target: string, threadId: string) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ snapshot: OffdexWorkspaceSnapshot }>(relayTarget, {
      id: `review-${Date.now()}`,
      action: "review/start",
      threadId,
    });
  }
  return fetchJson<{ snapshot: OffdexWorkspaceSnapshot }>(`${target}/review`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ threadId }),
  });
}

export async function sendBridgeMcpOauthLogin(target: string, name: string) {
  const relayTarget = decodeRelayConnectionTarget(target);
  if (relayTarget) {
    return sendRelayRequest<{ authorizationUrl: string }>(relayTarget, {
      id: `mcp-oauth-${Date.now()}`,
      action: "mcp/oauth/login",
      name,
    });
  }
  return fetchJson<{ authorizationUrl: string }>(`${target}/mcp/oauth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
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
