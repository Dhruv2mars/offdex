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

export interface OffdexGitInfo {
  sha: string | null;
  branch: string | null;
  originUrl: string | null;
}

export interface OffdexAppRecord {
  id: string;
  name: string;
  description: string | null;
  developer: string | null;
  category: string | null;
  distributionChannel: string | null;
  installUrl: string | null;
  websiteUrl: string | null;
  isAccessible: boolean;
  isEnabled: boolean;
  logoUrl: string | null;
  logoUrlDark: string | null;
  labels: Record<string, string>;
}

export interface OffdexModelRecord {
  id: string;
  model: string;
  displayName: string;
  description: string;
  defaultReasoningEffort: string;
  reasoningEfforts: string[];
  inputModalities: string[];
  isDefault: boolean;
  hidden: boolean;
}

export interface OffdexConfigSummary {
  model: string | null;
  modelProvider: string | null;
  reasoningEffort: string | null;
  sandboxMode: string | null;
  approvalPolicy: string | null;
  webSearch: string | null;
}

export interface OffdexRateLimitWindow {
  usedPercent: number | null;
  windowDurationMins: number | null;
  resetsAt: string | null;
}

export interface OffdexRateLimitCredits {
  hasCredits: boolean;
  unlimited: boolean;
  balance: string | null;
}

export interface OffdexRateLimitsSummary {
  limitId: string | null;
  limitName: string | null;
  planType: string | null;
  primary: OffdexRateLimitWindow | null;
  secondary: OffdexRateLimitWindow | null;
  credits: OffdexRateLimitCredits | null;
}

export interface OffdexExperimentalFeatureRecord {
  name: string;
  stage: string | null;
  displayName: string | null;
  description: string | null;
  announcement: string | null;
  enabled: boolean;
  defaultEnabled: boolean;
}

export interface OffdexRemoteFileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
}

export interface OffdexRemoteFileMatch {
  name: string;
  path: string;
  root: string;
  kind: "file" | "directory";
  score: number;
}

export type OffdexInputItem =
  | { type: "text"; text: string }
  | { type: "image"; url: string }
  | { type: "localImage"; path: string }
  | { type: "skill"; name: string; path: string }
  | { type: "mention"; name: string; path: string };

export type OffdexTimelineItem =
  | {
      type: "userMessage";
      id: string;
      content: OffdexInputItem[];
    }
  | {
      type: "agentMessage";
      id: string;
      text: string;
      phase?: "commentary" | "final_answer" | null;
    }
  | {
      type: "reasoning";
      id: string;
      summary: string[];
      content: string[];
    }
  | {
      type: "plan";
      id: string;
      text: string;
    }
  | {
      type: "taskLifecycle";
      id: string;
      label: string;
      status: "pending" | "in_progress" | "completed" | "failed" | "interrupted";
      detail: string | null;
    }
  | {
      type: "toolActivity";
      id: string;
      toolName: string;
      status: "pending" | "in_progress" | "completed" | "failed" | "interrupted";
      source: "tool" | "search" | "file" | "mcp" | "unknown";
      summary: string | null;
      input: string | null;
      output: string | null;
    }
  | {
      type: "tokenUsage";
      id: string;
      summary: string;
      planType: string | null;
      primaryPercent: number | null;
      secondaryPercent: number | null;
      totalTokens: number | null;
    }
  | {
      type: "commandExecution";
      id: string;
      command: string;
      cwd: string | null;
      status: "pending" | "in_progress" | "completed" | "failed" | "interrupted";
      aggregatedOutput: string;
      exitCode: number | null;
      durationMs: number | null;
      source?: string | null;
      processId?: string | null;
      actions?: Array<{
        type: string;
        command?: string;
        name?: string;
        path?: string;
      }>;
    }
  | {
      type: "unknown";
      id: string;
      label: string;
      data: string;
    };

export interface OffdexTurn {
  id: string;
  status: "inProgress" | "completed" | "failed" | "interrupted";
  items: OffdexTimelineItem[];
  errorMessage: string | null;
  diff?: string | null;
}

export interface OffdexApprovalRequest {
  id: string;
  method: string;
  title: string;
  detail: string;
  threadId: string | null;
  turnId: string | null;
  createdAt: string;
  status: "pending" | "approved" | "declined";
  inputSchema: "decision" | "answers" | "unknown";
  rawParams: string;
}

export interface OffdexPermissionReview {
  id: string;
  threadId: string | null;
  turnId: string | null;
  title: string;
  detail: string;
  status: "running" | "completed";
  outcome: "approved" | "declined" | "unknown" | null;
  updatedAt: string;
}

export interface OffdexPluginRecord {
  id: string;
  name: string;
  pluginName?: string;
  marketplacePath?: string | null;
  path: string;
  source: "local" | "cache";
  enabled?: boolean;
  installed?: boolean;
  installPolicy?: string | null;
  authPolicy?: string | null;
  category?: string | null;
  description?: string | null;
  developer?: string | null;
  websiteUrl?: string | null;
  capabilities?: string[];
}

export interface OffdexSkillRecord {
  id: string;
  name: string;
  path: string;
  source: "agents" | "codex" | "plugin";
  enabled?: boolean;
  scope?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  cwd?: string | null;
}

export interface OffdexMcpServerRecord {
  name: string;
  authStatus: "unsupported" | "notLoggedIn" | "bearerToken" | "oAuth" | string;
  toolCount: number;
  resourceCount: number;
  resourceTemplateCount: number;
}

export interface OffdexAutomationRecord {
  id: string;
  name: string;
  path: string;
  status: string | null;
  kind: string | null;
  schedule: string | null;
}

export interface OffdexWorkbenchInventory {
  codeHome: string;
  plugins: OffdexPluginRecord[];
  skills: OffdexSkillRecord[];
  mcpServers: OffdexMcpServerRecord[];
  automations: OffdexAutomationRecord[];
  apps?: OffdexAppRecord[];
  models?: OffdexModelRecord[];
  config?: OffdexConfigSummary | null;
  rateLimits?: OffdexRateLimitsSummary | null;
  experimentalFeatures?: OffdexExperimentalFeatureRecord[];
}

export interface OffdexThread {
  id: string;
  title: string;
  projectLabel: string;
  threadKind: "conversation" | "review";
  sourceThreadId: string | null;
  reviewThreadId: string | null;
  summary: OffdexThreadSummary;
  runtimeTarget: RuntimeTarget;
  state: TurnState;
  unreadCount: number;
  updatedAt: string;
  path: string | null;
  cwd: string | null;
  cliVersion: string | null;
  source: string | null;
  agentNickname: string | null;
  agentRole: string | null;
  gitInfo: OffdexGitInfo | null;
  messages: OffdexMessage[];
  turns: OffdexTurn[];
}

export interface OffdexThreadSummary {
  messageCount: number;
  commandCount: number;
  toolActivityCount: number;
  reasoningCount: number;
  diffTurnCount: number;
  latestAssistantText: string | null;
  pendingApprovalCount: number;
  activePermissionReviewCount: number;
  failedTurnCount: number;
}

export interface OffdexWorkspaceSnapshot {
  pairing: OffdexPairingProfile;
  capabilityMatrix: DeviceCapabilityMatrix;
  account: OffdexRuntimeAccount | null;
  pendingApprovals: OffdexApprovalRequest[];
  permissionReviews: OffdexPermissionReview[];
  threads: OffdexThread[];
  archivedThreads: OffdexThread[];
}

export function summarizeOffdexThread(
  thread: Pick<OffdexThread, "id" | "messages" | "turns">,
  context?: {
    pendingApprovals?: OffdexApprovalRequest[];
    permissionReviews?: OffdexPermissionReview[];
  }
): OffdexThreadSummary {
  const timelineItems = thread.turns.flatMap((turn) => turn.items);
  const latestAssistantText =
    [...thread.messages].reverse().find((message) => message.role === "assistant")?.body ?? null;

  return {
    messageCount: thread.messages.length,
    commandCount: timelineItems.filter((item) => item.type === "commandExecution").length,
    toolActivityCount: timelineItems.filter((item) => item.type === "toolActivity").length,
    reasoningCount: timelineItems.filter((item) => item.type === "reasoning" || item.type === "plan").length,
    diffTurnCount: thread.turns.filter((turn) => Boolean(turn.diff?.trim())).length,
    latestAssistantText,
    pendingApprovalCount: (context?.pendingApprovals ?? []).filter(
      (approval) => approval.threadId === thread.id && approval.status === "pending"
    ).length,
    activePermissionReviewCount: (context?.permissionReviews ?? []).filter(
      (review) => review.threadId === thread.id && review.status === "running"
    ).length,
    failedTurnCount: thread.turns.filter(
      (turn) => turn.status === "failed" || Boolean(turn.errorMessage?.trim())
    ).length,
  };
}

export function refreshSnapshotThreadSummaries(snapshot: OffdexWorkspaceSnapshot) {
  const context = {
    pendingApprovals: snapshot.pendingApprovals,
    permissionReviews: snapshot.permissionReviews,
  };
  snapshot.threads = snapshot.threads.map((thread) => ({
    ...thread,
    summary: summarizeOffdexThread(thread, context),
  }));
  snapshot.archivedThreads = snapshot.archivedThreads.map((thread) => ({
    ...thread,
    summary: summarizeOffdexThread(thread, context),
  }));
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
  const foundationMessages = [
    makeMessage("m1", "user", "Start the real Offdex implementation.", "09:12"),
    makeMessage(
      "m2",
      "assistant",
      "Building shared protocol, bridge core, relay core, and a stronger mobile shell first.",
      "09:13"
    ),
  ];
  const linuxMessages = [
    makeMessage("m3", "user", "What should happen when desktop mode is unavailable?", "08:42"),
    makeMessage(
      "m4",
      "assistant",
      "The runtime picker should degrade cleanly to CLI and explain why without blocking the flow.",
      "08:44"
    ),
  ];
  const uxMessages = [
    makeMessage("m5", "user", "Push the UI quality much further.", "07:25"),
    makeMessage(
      "m6",
      "assistant",
      "That means live truth, stable pairing, clear runtime state, and visual restraint instead of noisy widgets.",
      "07:28"
    ),
  ];

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
    account: null,
    pendingApprovals: [],
    permissionReviews: [],
    archivedThreads: [],
    threads: [
      {
        id: "thread-foundation",
        title: "Ship Offdex foundation",
        projectLabel: "offdex",
        threadKind: "conversation",
        sourceThreadId: null,
        reviewThreadId: null,
        summary: {
          messageCount: foundationMessages.length,
          commandCount: 0,
          toolActivityCount: 0,
          reasoningCount: 0,
          diffTurnCount: 0,
          latestAssistantText: foundationMessages[1]!.body,
          pendingApprovalCount: 0,
          activePermissionReviewCount: 0,
          failedTurnCount: 0,
        },
        runtimeTarget,
        state: "running",
        unreadCount: 0,
        updatedAt: "2m ago",
        path: null,
        cwd: null,
        cliVersion: null,
        source: "demo",
        agentNickname: null,
        agentRole: null,
        gitInfo: null,
        messages: foundationMessages,
        turns: [
          {
            id: "turn-foundation",
            status: "inProgress",
            errorMessage: null,
            items: [
              {
                type: "userMessage",
                id: "m1",
                content: [{ type: "text", text: foundationMessages[0]!.body }],
              },
              {
                type: "agentMessage",
                id: "m2",
                text: foundationMessages[1]!.body,
                phase: "commentary",
              },
            ],
          },
        ],
      },
      {
        id: "thread-linux",
        title: "Runtime targeting on Linux",
        projectLabel: "bridge",
        threadKind: "conversation",
        sourceThreadId: null,
        reviewThreadId: null,
        summary: {
          messageCount: linuxMessages.length,
          commandCount: 0,
          toolActivityCount: 0,
          reasoningCount: 0,
          diffTurnCount: 0,
          latestAssistantText: linuxMessages[1]!.body,
          pendingApprovalCount: 0,
          activePermissionReviewCount: 0,
          failedTurnCount: 0,
        },
        runtimeTarget: "cli",
        state: "idle",
        unreadCount: 3,
        updatedAt: "21m ago",
        path: null,
        cwd: null,
        cliVersion: null,
        source: "demo",
        agentNickname: null,
        agentRole: null,
        gitInfo: null,
        messages: linuxMessages,
        turns: [
          {
            id: "turn-linux",
            status: "completed",
            errorMessage: null,
            items: [
              {
                type: "userMessage",
                id: "m3",
                content: [{ type: "text", text: linuxMessages[0]!.body }],
              },
              {
                type: "agentMessage",
                id: "m4",
                text: linuxMessages[1]!.body,
                phase: "final_answer",
              },
            ],
          },
        ],
      },
      {
        id: "thread-ux",
        title: "Make the app feel official",
        projectLabel: "mobile",
        threadKind: "conversation",
        sourceThreadId: null,
        reviewThreadId: null,
        summary: {
          messageCount: uxMessages.length,
          commandCount: 0,
          toolActivityCount: 0,
          reasoningCount: 0,
          diffTurnCount: 0,
          latestAssistantText: uxMessages[1]!.body,
          pendingApprovalCount: 0,
          activePermissionReviewCount: 0,
          failedTurnCount: 0,
        },
        runtimeTarget,
        state: "completed",
        unreadCount: 0,
        updatedAt: "1h ago",
        path: null,
        cwd: null,
        cliVersion: null,
        source: "demo",
        agentNickname: null,
        agentRole: null,
        gitInfo: null,
        messages: uxMessages,
        turns: [
          {
            id: "turn-ux",
            status: "completed",
            errorMessage: null,
            items: [
              {
                type: "userMessage",
                id: "m5",
                content: [{ type: "text", text: uxMessages[0]!.body }],
              },
              {
                type: "agentMessage",
                id: "m6",
                text: uxMessages[1]!.body,
                phase: "final_answer",
              },
            ],
          },
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
    refreshSnapshotThreadSummaries(this.#snapshot);
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
    refreshSnapshotThreadSummaries(this.#snapshot);
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

  updateAccount(account: OffdexRuntimeAccount | null) {
    this.#snapshot.account = account;
    this.#emit();
  }

  setArchivedThreads(threads: OffdexThread[]) {
    this.#snapshot.archivedThreads = structuredClone(threads);
    refreshSnapshotThreadSummaries(this.#snapshot);
    this.#emit();
  }

  upsertApproval(approval: OffdexApprovalRequest) {
    const existingIndex = this.#snapshot.pendingApprovals.findIndex((entry) => entry.id === approval.id);
    if (existingIndex >= 0) {
      this.#snapshot.pendingApprovals[existingIndex] = approval;
    } else {
      this.#snapshot.pendingApprovals.unshift(approval);
    }
    refreshSnapshotThreadSummaries(this.#snapshot);
    this.#emit();
  }

  upsertPermissionReview(review: OffdexPermissionReview) {
    const existingIndex = this.#snapshot.permissionReviews.findIndex((entry) => entry.id === review.id);
    if (existingIndex >= 0) {
      this.#snapshot.permissionReviews[existingIndex] = review;
    } else {
      this.#snapshot.permissionReviews.unshift(review);
      this.#snapshot.permissionReviews = this.#snapshot.permissionReviews.slice(0, 8);
    }
    refreshSnapshotThreadSummaries(this.#snapshot);
    this.#emit();
  }

  resolveApproval(id: string, status: "approved" | "declined") {
    this.#snapshot.pendingApprovals = this.#snapshot.pendingApprovals.map((approval) =>
      approval.id === id ? { ...approval, status } : approval
    );
    refreshSnapshotThreadSummaries(this.#snapshot);
    this.#emit();
  }

  clearResolvedApprovals() {
    this.#snapshot.pendingApprovals = this.#snapshot.pendingApprovals.filter(
      (approval) => approval.status === "pending"
    );
    refreshSnapshotThreadSummaries(this.#snapshot);
    this.#emit();
  }

  #emit() {
    const nextSnapshot = this.getSnapshot();
    for (const listener of this.#listeners) {
      listener(nextSnapshot);
    }
  }
}
