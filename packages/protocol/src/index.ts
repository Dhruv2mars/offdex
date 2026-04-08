import nacl from "tweetnacl";
import { decodeUTF8, encodeBase64, decodeBase64, encodeUTF8 } from "tweetnacl-util";

export type RuntimeTarget = "cli" | "desktop";
export type PairingState = "unpaired" | "paired" | "reconnecting";
export type TurnState = "idle" | "running" | "completed" | "failed";
export const OFFDEX_TRANSPORT_MODES = ["local", "relay"] as const;
export type OffdexTransportMode = (typeof OFFDEX_TRANSPORT_MODES)[number];
export type OffdexDeviceId = string;
export const OFFDEX_NEW_THREAD_ID = "offdex-new-thread";

export interface DeviceCapabilityMatrix {
  mobile: "expo";
  web: "next";
  runtimes: RuntimeTarget[];
}

export interface OffdexPairingProfile {
  bridgeUrl: string;
  bridgeHints: string[];
  macName: string;
  state: PairingState;
  lastSeenAt: string;
  runtimeTarget: RuntimeTarget;
}

export interface OffdexMessage {
  id: string;
  role: "user" | "assistant" | "system";
  body: string;
  createdAt: string;
}

export interface OffdexThread {
  id: string;
  title: string;
  projectLabel: string;
  runtimeTarget: RuntimeTarget;
  state: TurnState;
  unreadCount: number;
  updatedAt: string;
  messages: OffdexMessage[];
}

export interface OffdexWorkspaceSnapshot {
  pairing: OffdexPairingProfile;
  capabilityMatrix: DeviceCapabilityMatrix;
  threads: OffdexThread[];
}

export interface OffdexAccountSession {
  deviceId: OffdexDeviceId;
  deviceLabel: string;
  ownerId: string;
  ownerLabel: string;
  token: string;
  issuedAt: string;
  expiresAt: string | null;
}

export interface OffdexRuntimeAccount {
  id: string | null;
  email: string | null;
  name: string | null;
  planType: string | null;
  isAuthenticated: boolean;
}

export interface OffdexTrustedDeviceRecord {
  deviceId: OffdexDeviceId;
  deviceLabel: string;
  ownerId: string;
  trustedAt: string;
  lastSeenAt: string;
}

export interface OffdexRemoteCapability {
  controlPlaneUrl: string;
  machineId: string;
  directBridgeUrls: string[];
  relayUrl: string;
  relayRoomId: string;
}

export interface OffdexMachineRecord {
  machineId: string;
  macName: string;
  ownerId: string;
  ownerLabel: string;
  runtimeTarget: RuntimeTarget;
  lastSeenAt: string;
  online: boolean;
  directBridgeUrls: string[];
  localBridgeUrl: string;
  capabilityMatrix: DeviceCapabilityMatrix;
  remoteCapability: OffdexRemoteCapability | null;
}

export interface OffdexConnectionTicket {
  ticketId: string;
  machineId: string;
  ownerId: string;
  transportMode: OffdexTransportMode;
  issuedAt: string;
  expiresAt: string;
  local: {
    bridgeUrls: string[];
  } | null;
  direct?: {
    bridgeUrls: string[];
    accessToken: string;
  } | null;
  relay: {
    relayUrl: string;
    roomId: string;
    secret: string;
  } | null;
}

export interface WorkspaceMutationInput {
  threadId: string;
  message: OffdexMessage;
  state?: TurnState;
  updatedAt?: string;
}

export interface OffdexPairingPayload {
  bridgeUrl: string;
  macName: string;
  relay?: {
    relayUrl: string;
    roomId: string;
    secret: string;
  };
  remote?: {
    controlPlaneUrl: string;
    machineId: string;
    claimCode: string;
    ownerLabel: string;
  };
  version: 1 | 2 | 3;
}

export interface OffdexRelayCipherPayload {
  nonce: string;
  ciphertext: string;
}

function toBase64Url(value: string) {
  return value.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function makeMessage(
  id: string,
  role: OffdexMessage["role"],
  body: string,
  createdAt: string
): OffdexMessage {
  return { id, role, body, createdAt };
}

export function encodePairingUri(payload: Omit<OffdexPairingPayload, "version">) {
  const search = new URLSearchParams({
    bridge: payload.bridgeUrl,
    name: payload.macName,
    v: payload.remote ? "3" : payload.relay ? "2" : "1",
  });

  if (payload.relay) {
    search.set("relay", payload.relay.relayUrl);
    search.set("room", payload.relay.roomId);
    search.set("secret", payload.relay.secret);
  }

  if (payload.remote) {
    search.set("control", payload.remote.controlPlaneUrl);
    search.set("machine", payload.remote.machineId);
    search.set("claim", payload.remote.claimCode);
    search.set("owner", payload.remote.ownerLabel);
  }

  return `offdex://pair?${search.toString()}`;
}

export function decodePairingUri(uri: string): OffdexPairingPayload {
  let parsed: URL;

  try {
    parsed = new URL(uri);
  } catch {
    throw new Error("Invalid Offdex pairing link.");
  }

  if (parsed.protocol !== "offdex:" || parsed.hostname !== "pair") {
    throw new Error("Invalid Offdex pairing link.");
  }

  const bridgeUrl = parsed.searchParams.get("bridge")?.trim();
  const macName = parsed.searchParams.get("name")?.trim();
  const version = parsed.searchParams.get("v");
  const relayUrl = parsed.searchParams.get("relay")?.trim();
  const roomId = parsed.searchParams.get("room")?.trim();
  const secret = parsed.searchParams.get("secret")?.trim();
  const controlPlaneUrl = parsed.searchParams.get("control")?.trim();
  const machineId = parsed.searchParams.get("machine")?.trim();
  const claimCode = parsed.searchParams.get("claim")?.trim();
  const ownerLabel = parsed.searchParams.get("owner")?.trim();

  if (!bridgeUrl || !macName || (version !== "1" && version !== "2" && version !== "3")) {
    throw new Error("Invalid Offdex pairing link.");
  }

  if (version === "2" && (!relayUrl || !roomId || !secret)) {
    throw new Error("Invalid Offdex pairing link.");
  }

  if (version === "3" && (!controlPlaneUrl || !machineId || !claimCode || !ownerLabel)) {
    throw new Error("Invalid Offdex pairing link.");
  }

  return {
    bridgeUrl,
    macName,
    relay:
      version === "2"
        ? {
            relayUrl: relayUrl!,
            roomId: roomId!,
            secret: secret!,
          }
        : undefined,
    remote:
      version === "3"
        ? {
            controlPlaneUrl: controlPlaneUrl!,
            machineId: machineId!,
            claimCode: claimCode!,
            ownerLabel: ownerLabel!,
          }
        : undefined,
    version: version === "3" ? 3 : version === "2" ? 2 : 1,
  };
}

function deriveRelayKey(secret: string) {
  return nacl.hash(decodeUTF8(secret)).slice(0, nacl.secretbox.keyLength);
}

function base64UrlToBase64(value: string) {
  const paddingLength = value.length % 4 === 0 ? 0 : 4 - (value.length % 4);
  return value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat(paddingLength);
}

export function createRelayAuthToken(secret: string, roomId: string) {
  return toBase64Url(
    encodeBase64(nacl.hash(decodeUTF8(`offdex:relay:${roomId}:${secret}`)))
  );
}

export function createBridgeAccessToken(secret: string, ticketId: string, expiresAt: string) {
  const payload = JSON.stringify({
    ticketId,
    expiresAt,
    signature: toBase64Url(
      encodeBase64(nacl.hash(decodeUTF8(`offdex:bridge:${ticketId}:${expiresAt}:${secret}`)))
    ),
  });
  return toBase64Url(encodeBase64(decodeUTF8(payload)));
}

export function verifyBridgeAccessToken(
  secret: string,
  token: string,
  input: {
    ticketId?: string;
    now?: string;
    expiresAt?: string;
  }
) {
  const payload = parseBridgeTokenPayload(token);
  const ticketId = input.ticketId ?? payload?.ticketId ?? null;
  const expiresAt = input.expiresAt ?? payload?.expiresAt ?? null;
  if (!ticketId) {
    return false;
  }
  if (!expiresAt) {
    return false;
  }

  if (Date.parse(input.now ?? new Date().toISOString()) > Date.parse(expiresAt)) {
    return false;
  }

  return payload?.signature === createBridgeTokenSignature(secret, ticketId, expiresAt);
}

function createBridgeTokenSignature(secret: string, ticketId: string, expiresAt: string) {
  return toBase64Url(
    encodeBase64(nacl.hash(decodeUTF8(`offdex:bridge:${ticketId}:${expiresAt}:${secret}`)))
  );
}

function parseBridgeTokenPayload(token: string) {
  try {
    const raw = JSON.parse(encodeUTF8(decodeBase64(base64UrlToBase64(token)))) as {
      ticketId?: string;
      expiresAt?: string;
      signature?: string;
    };
    if (!raw.ticketId || !raw.expiresAt || !raw.signature) {
      return null;
    }

    return raw;
  } catch {
    return null;
  }
}

export function encryptRelayPayload(secret: string, payload: unknown): OffdexRelayCipherPayload {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const message = decodeUTF8(JSON.stringify(payload));
  const box = nacl.secretbox(message, nonce, deriveRelayKey(secret));

  return {
    nonce: encodeBase64(nonce),
    ciphertext: encodeBase64(box),
  };
}

export function decryptRelayPayload<T>(secret: string, payload: OffdexRelayCipherPayload): T {
  const message = nacl.secretbox.open(
    decodeBase64(payload.ciphertext),
    decodeBase64(payload.nonce),
    deriveRelayKey(secret)
  );

  if (!message) {
    throw new Error("Invalid Offdex relay payload.");
  }

  return JSON.parse(encodeUTF8(message)) as T;
}

export function makeDemoWorkspaceSnapshot(
  runtimeTarget: RuntimeTarget = "cli",
  pairingProfile: Partial<OffdexPairingProfile> = {}
): OffdexWorkspaceSnapshot {
  return {
    pairing: {
      bridgeUrl: "http://127.0.0.1:42420",
      bridgeHints: ["http://127.0.0.1:42420"],
      macName: "This Mac",
      state: "unpaired",
      lastSeenAt: "Not connected",
      runtimeTarget,
      ...pairingProfile,
    },
    capabilityMatrix: {
      mobile: "expo",
      web: "next",
      runtimes: ["cli"],
    },
    threads: [
      {
        id: "thread-foundation",
        title: "Ship Offdex foundation",
        projectLabel: "offdex",
        runtimeTarget,
        state: "running",
        unreadCount: 0,
        updatedAt: "2m ago",
        messages: [
          makeMessage("m1", "user", "Start the real Offdex implementation.", "09:12"),
          makeMessage(
            "m2",
            "assistant",
            "Building shared protocol, bridge core, relay core, and a stronger mobile shell first.",
            "09:13"
          ),
        ],
      },
      {
        id: "thread-linux",
        title: "Runtime targeting on Linux",
        projectLabel: "bridge",
        runtimeTarget: "cli",
        state: "idle",
        unreadCount: 3,
        updatedAt: "21m ago",
        messages: [
          makeMessage("m3", "user", "What should happen when desktop mode is unavailable?", "08:42"),
          makeMessage(
            "m4",
            "assistant",
            "The runtime picker should degrade cleanly to CLI and explain why without blocking the flow.",
            "08:44"
          ),
        ],
      },
      {
        id: "thread-ux",
        title: "Make the app feel official",
        projectLabel: "mobile",
        runtimeTarget,
        state: "completed",
        unreadCount: 0,
        updatedAt: "1h ago",
        messages: [
          makeMessage("m5", "user", "Push the UI quality much further.", "07:25"),
          makeMessage(
            "m6",
            "assistant",
            "That means live truth, stable pairing, clear runtime state, and visual restraint instead of noisy widgets.",
            "07:28"
          ),
        ],
      },
    ],
  };
}

export class WorkspaceSnapshotStore {
  #snapshot: OffdexWorkspaceSnapshot;
  #listeners = new Set<(snapshot: OffdexWorkspaceSnapshot) => void>();

  constructor(initialSnapshot: OffdexWorkspaceSnapshot = makeDemoWorkspaceSnapshot()) {
    this.#snapshot = structuredClone(initialSnapshot);
  }

  getSnapshot() {
    return structuredClone(this.#snapshot);
  }

  replaceSnapshot(snapshot: OffdexWorkspaceSnapshot) {
    this.#snapshot = structuredClone(snapshot);
    this.#emit();
  }

  subscribe(listener: (snapshot: OffdexWorkspaceSnapshot) => void) {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  setRuntimeTarget(runtimeTarget: RuntimeTarget) {
    this.#snapshot.pairing.runtimeTarget = runtimeTarget;
    this.#snapshot.capabilityMatrix.runtimes = ["cli"];
    this.#snapshot.threads = this.#snapshot.threads.map((thread) => ({
      ...thread,
      runtimeTarget: thread.id === "thread-linux" ? "cli" : runtimeTarget,
    }));
    this.#emit();
  }

  appendMessage(input: WorkspaceMutationInput) {
    this.#snapshot.threads = this.#snapshot.threads.map((thread) => {
      if (thread.id !== input.threadId) {
        return thread;
      }

      return {
        ...thread,
        state: input.state ?? thread.state,
        updatedAt: input.updatedAt ?? thread.updatedAt,
        messages: [...thread.messages, input.message],
      };
    });
    this.#emit();
  }

  updatePairingState(state: PairingState, lastSeenAt: string) {
    this.#snapshot.pairing.state = state;
    this.#snapshot.pairing.lastSeenAt = lastSeenAt;
    this.#emit();
  }

  updatePairingProfile(patch: Partial<OffdexPairingProfile>) {
    this.#snapshot.pairing = {
      ...this.#snapshot.pairing,
      ...patch,
    };
    this.#emit();
  }

  #emit() {
    const nextSnapshot = this.getSnapshot();
    for (const listener of this.#listeners) {
      listener(nextSnapshot);
    }
  }
}
