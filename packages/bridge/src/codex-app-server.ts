import { existsSync } from "node:fs";
import { basename } from "node:path";
import { createServer } from "node:net";
import {
  WorkspaceSnapshotStore,
  makeDemoWorkspaceSnapshot,
  type OffdexMessage,
  type OffdexThread,
  type OffdexWorkspaceSnapshot,
  type RuntimeTarget,
} from "@offdex/protocol";

export const NEW_THREAD_ID = "offdex-new-thread";

type EnvShape = {
  [key: string]: string | undefined;
  HOME?: string;
  OFFDEX_CODEX_BIN?: string;
};

type CodexThreadStatus =
  | { type: "notLoaded" }
  | { type: "idle" }
  | { type: "systemError" }
  | { type: "active"; activeFlags?: string[] };

type CodexUserInput =
  | { type: "text"; text: string; text_elements?: ReadonlyArray<unknown> }
  | { type: "image"; url: string }
  | { type: "localImage"; path: string }
  | { type: "skill"; name: string; path: string }
  | { type: "mention"; name: string; path: string };

type CodexThreadItem =
  | { type: "userMessage"; id: string; content: ReadonlyArray<CodexUserInput> }
  | {
      type: "agentMessage";
      id: string;
      text: string;
      phase?: "commentary" | "final_answer" | null;
      memoryCitation?: unknown;
    }
  | {
      type: "reasoning";
      id: string;
      summary: ReadonlyArray<string>;
      content: ReadonlyArray<string>;
    }
  | { type: "plan"; id: string; text: string }
  | { type: "other"; id: string };

type CodexTurnStatus = "inProgress" | "completed" | "failed" | "interrupted";

type CodexTurn = {
  id: string;
  items: ReadonlyArray<CodexThreadItem>;
  status: CodexTurnStatus;
  error: unknown | null;
};

export type CodexThread = {
  id: string;
  preview: string;
  ephemeral: boolean;
  modelProvider: string;
  createdAt: number;
  updatedAt: number;
  status: CodexThreadStatus;
  path: string | null;
  cwd: string;
  cliVersion: string;
  source: string;
  agentNickname: string | null;
  agentRole: string | null;
  gitInfo: unknown | null;
  name: string | null;
  turns: ReadonlyArray<CodexTurn>;
};

export type CodexServerNotification =
  | { method: "thread/started"; params: { thread: CodexThread } }
  | { method: "thread/status/changed"; params: { threadId: string; status: CodexThreadStatus } }
  | { method: "turn/started"; params: { threadId: string; turn: CodexTurn } }
  | { method: "turn/completed"; params: { threadId: string; turn: CodexTurn } }
  | { method: "item/started"; params: { threadId: string; turnId: string; item: CodexThreadItem } }
  | { method: "item/completed"; params: { threadId: string; turnId: string; item: CodexThreadItem } }
  | {
      method: "item/agentMessage/delta";
      params: { threadId: string; turnId: string; itemId: string; delta: string };
    }
  | {
      method: "error";
      params: { threadId: string; turnId: string; error: unknown; willRetry: boolean };
    }
  | { method: string; params?: unknown };

type ThreadStartedNotification = Extract<CodexServerNotification, { method: "thread/started" }>;
type ThreadStatusChangedNotification = Extract<
  CodexServerNotification,
  { method: "thread/status/changed" }
>;
type TurnStartedNotification = Extract<CodexServerNotification, { method: "turn/started" }>;
type TurnCompletedNotification = Extract<CodexServerNotification, { method: "turn/completed" }>;
type ItemStartedNotification = Extract<CodexServerNotification, { method: "item/started" }>;
type ItemCompletedNotification = Extract<CodexServerNotification, { method: "item/completed" }>;
type AgentDeltaNotification = Extract<
  CodexServerNotification,
  { method: "item/agentMessage/delta" }
>;
type ErrorNotification = Extract<CodexServerNotification, { method: "error" }>;

type JsonRpcResponse = {
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

type JsonRpcNotification = {
  method: string;
  params?: unknown;
};

type JsonRpcServerRequest = {
  id: number | string;
  method: string;
  params?: unknown;
};

function formatUpdatedAt(unixSeconds: number) {
  const deltaSeconds = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
  if (deltaSeconds < 60) {
    return "Just now";
  }

  const deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours}h ago`;
  }

  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays}d ago`;
}

function titleFromThread(thread: CodexThread) {
  return thread.name?.trim() || thread.preview?.trim() || `Thread ${thread.id.slice(0, 6)}`;
}

function projectLabelFromThread(thread: CodexThread) {
  return basename(thread.cwd) || "workspace";
}

function turnStatusToState(status: CodexTurnStatus): OffdexThread["state"] {
  if (status === "inProgress") {
    return "running";
  }

  if (status === "failed") {
    return "failed";
  }

  if (status === "completed") {
    return "completed";
  }

  return "idle";
}

function threadStatusToState(
  status: CodexThreadStatus,
  messageCount: number
): OffdexThread["state"] {
  if (status.type === "active") {
    return "running";
  }

  if (status.type === "systemError") {
    return "failed";
  }

  if (messageCount === 0) {
    return "idle";
  }

  return "completed";
}

function userInputToText(input: CodexUserInput) {
  switch (input.type) {
    case "text":
      return input.text;
    case "image":
      return `[Image] ${input.url}`;
    case "localImage":
      return `[Local image] ${input.path}`;
    case "skill":
      return `[Skill] ${input.name}`;
    case "mention":
      return `[Mention] ${input.name}`;
  }
}

function threadItemToMessage(
  item: CodexThreadItem,
  updatedAtLabel: string
): OffdexMessage | null {
  if (item.type === "userMessage") {
    const body = item.content.map(userInputToText).join("\n").trim();
    if (!body) {
      return null;
    }

    return {
      id: item.id,
      role: "user",
      body,
      createdAt: updatedAtLabel,
    };
  }

  if (item.type === "agentMessage") {
    return {
      id: item.id,
      role: "assistant",
      body: item.text,
      createdAt: updatedAtLabel,
    };
  }

  return null;
}

function sortThreadsByUpdatedAt(threads: CodexThread[]) {
  return [...threads].sort((left, right) => right.updatedAt - left.updatedAt);
}

function makePlaceholderThread(runtimeTarget: RuntimeTarget): OffdexThread {
  return {
    id: NEW_THREAD_ID,
    title: "New Codex thread",
    projectLabel: "offdex",
    runtimeTarget,
    state: "idle",
    unreadCount: 0,
    updatedAt: "Ready",
    messages: [],
  };
}

export function mapCodexThreadToOffdexThread(
  thread: CodexThread,
  runtimeTarget: RuntimeTarget
): OffdexThread {
  const updatedAtLabel = formatUpdatedAt(thread.updatedAt);
  const messages = thread.turns.flatMap((turn) =>
    turn.items
      .map((item) => threadItemToMessage(item, updatedAtLabel))
      .filter((message): message is OffdexMessage => message !== null)
  );
  const latestTurn = thread.turns.at(-1);
  const state = latestTurn
    ? turnStatusToState(latestTurn.status)
    : threadStatusToState(thread.status, messages.length);

  return {
    id: thread.id,
    title: titleFromThread(thread),
    projectLabel: projectLabelFromThread(thread),
    runtimeTarget,
    state,
    unreadCount: 0,
    updatedAt: updatedAtLabel,
    messages,
  };
}

export function createCodexSnapshot(
  runtimeTarget: RuntimeTarget,
  threads: CodexThread[],
  seedSnapshot: OffdexWorkspaceSnapshot = makeDemoWorkspaceSnapshot(runtimeTarget)
): OffdexWorkspaceSnapshot {
  const mappedThreads = sortThreadsByUpdatedAt(threads).map((thread) =>
    mapCodexThreadToOffdexThread(thread, runtimeTarget)
  );

  return {
    ...structuredClone(seedSnapshot),
    pairing: {
      ...seedSnapshot.pairing,
      runtimeTarget,
      state: "paired",
      lastSeenAt: "Just now",
    },
    capabilityMatrix: {
      ...seedSnapshot.capabilityMatrix,
      runtimes: ["cli"],
    },
    threads: mappedThreads.length > 0 ? mappedThreads : [makePlaceholderThread(runtimeTarget)],
  };
}

function ensureThread(
  snapshot: OffdexWorkspaceSnapshot,
  threadId: string,
  runtimeTarget: RuntimeTarget
) {
  const existing = snapshot.threads.find((thread) => thread.id === threadId);
  if (existing) {
    return existing;
  }

  const thread: OffdexThread = {
    id: threadId,
    title: `Thread ${threadId.slice(0, 6)}`,
    projectLabel: "offdex",
    runtimeTarget,
    state: "idle",
    unreadCount: 0,
    updatedAt: "Now",
    messages: [],
  };
  snapshot.threads = snapshot.threads.filter((entry) => entry.id !== NEW_THREAD_ID);
  snapshot.threads.unshift(thread);
  return thread;
}

function upsertThread(snapshot: OffdexWorkspaceSnapshot, thread: OffdexThread) {
  const otherThreads = snapshot.threads.filter(
    (entry) => entry.id !== thread.id && entry.id !== NEW_THREAD_ID
  );
  snapshot.threads = [thread, ...otherThreads];
}

function upsertMessage(thread: OffdexThread, message: OffdexMessage) {
  const existingIndex = thread.messages.findIndex((entry) => entry.id === message.id);
  if (existingIndex >= 0) {
    thread.messages[existingIndex] = message;
    return;
  }

  thread.messages.push(message);
}

function mergeAgentDelta(
  snapshot: OffdexWorkspaceSnapshot,
  threadId: string,
  itemId: string,
  delta: string,
  runtimeTarget: RuntimeTarget
) {
  const thread = ensureThread(snapshot, threadId, runtimeTarget);
  thread.state = "running";
  thread.updatedAt = "Now";
  const existing = thread.messages.find((message) => message.id === itemId);

  if (existing) {
    existing.body += delta;
    return;
  }

  thread.messages.push({
    id: itemId,
    role: "assistant",
    body: delta,
    createdAt: "Now",
  });
}

function applyItemUpdate(
  snapshot: OffdexWorkspaceSnapshot,
  threadId: string,
  item: CodexThreadItem,
  runtimeTarget: RuntimeTarget
) {
  const thread = ensureThread(snapshot, threadId, runtimeTarget);
  const message = threadItemToMessage(item, "Now");
  if (!message) {
    return;
  }

  thread.state = item.type === "agentMessage" ? "running" : thread.state;
  thread.updatedAt = "Now";
  upsertMessage(thread, message);
}

export function applyCodexNotification(
  snapshot: OffdexWorkspaceSnapshot,
  notification: CodexServerNotification,
  runtimeTarget: RuntimeTarget
): OffdexWorkspaceSnapshot {
  const next = structuredClone(snapshot);

  switch (notification.method) {
    case "thread/started":
      upsertThread(
        next,
        mapCodexThreadToOffdexThread(
          (notification as ThreadStartedNotification).params.thread,
          runtimeTarget
        )
      );
      return next;
    case "thread/status/changed": {
      const payload = (notification as ThreadStatusChangedNotification).params;
      const thread = ensureThread(next, payload.threadId, runtimeTarget);
      thread.state = threadStatusToState(payload.status, thread.messages.length);
      thread.updatedAt = "Now";
      return next;
    }
    case "turn/started": {
      const payload = (notification as TurnStartedNotification).params;
      const thread = ensureThread(next, payload.threadId, runtimeTarget);
      thread.state = "running";
      thread.updatedAt = "Now";
      return next;
    }
    case "turn/completed": {
      const payload = (notification as TurnCompletedNotification).params;
      const thread = ensureThread(next, payload.threadId, runtimeTarget);
      thread.state = turnStatusToState(payload.turn.status);
      thread.updatedAt = "Now";
      return next;
    }
    case "item/started": {
      const payload = (notification as ItemStartedNotification).params;
      applyItemUpdate(next, payload.threadId, payload.item, runtimeTarget);
      return next;
    }
    case "item/completed": {
      const payload = (notification as ItemCompletedNotification).params;
      applyItemUpdate(next, payload.threadId, payload.item, runtimeTarget);
      return next;
    }
    case "item/agentMessage/delta": {
      const payload = (notification as AgentDeltaNotification).params;
      mergeAgentDelta(
        next,
        payload.threadId,
        payload.itemId,
        payload.delta,
        runtimeTarget
      );
      return next;
    }
    case "error": {
      const payload = (notification as ErrorNotification).params;
      const thread = ensureThread(next, payload.threadId, runtimeTarget);
      thread.state = payload.willRetry ? "running" : "failed";
      thread.updatedAt = "Now";
      thread.messages.push({
        id: `${payload.turnId}-error`,
        role: "system",
        body: "Codex hit an error on this turn.",
        createdAt: "Now",
      });
      return next;
    }
    default:
      return next;
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function unique(values: ReadonlyArray<string>) {
  return [...new Set(values.filter(Boolean))];
}

export function buildCodexExecutableCandidates(
  env: EnvShape = process.env,
  which: (command: string) => string | null = Bun.which,
  fileExists: (path: string) => boolean = existsSync
) {
  const candidates = unique([
    env.OFFDEX_CODEX_BIN ?? "",
    env.HOME ? `${env.HOME}/.bun/bin/codex` : "",
    which("codex") ?? "",
  ]);

  return candidates.filter((candidate) => fileExists(candidate));
}

async function supportsCodexAppServer(binaryPath: string) {
  const process = Bun.spawn([binaryPath, "app-server", "--help"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ]);
  const output = `${stdout}\n${stderr}`;
  return output.includes("--listen");
}

export async function resolveCodexExecutable(
  env: EnvShape = process.env,
  which: (command: string) => string | null = Bun.which,
  fileExists: (path: string) => boolean = existsSync,
  probe: (binaryPath: string) => Promise<boolean> = supportsCodexAppServer
) {
  const candidates = buildCodexExecutableCandidates(env, which, fileExists);

  for (const candidate of candidates) {
    if (await probe(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "No supported Codex CLI found. Install the latest Codex CLI or set OFFDEX_CODEX_BIN."
  );
}

async function waitForReady(url: string, timeoutMs = 10_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {}

    await wait(200);
  }

  throw new Error(`Timed out waiting for Codex app-server at ${url}`);
}

async function getFreePort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to allocate a free port.")));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });
  });
}

export class CodexAppServerClient {
  #socket: WebSocket | null = null;
  #connectPromise: Promise<void> | null = null;
  #listeners = new Set<(notification: CodexServerNotification) => void>();
  #pending = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();
  #nextId = 1;
  #managedProcess: Bun.Subprocess<"ignore", "pipe", "pipe"> | null = null;
  #managedUrl: string | null = null;
  #codexExecutable: string | null = null;

  constructor(private readonly endpoint = process.env.OFFDEX_CODEX_ENDPOINT || null) {}

  get isConnected() {
    return this.#socket?.readyState === WebSocket.OPEN;
  }

  subscribe(listener: (notification: CodexServerNotification) => void) {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  async ensureConnected() {
    if (this.isConnected) {
      return;
    }

    if (this.#connectPromise) {
      return this.#connectPromise;
    }

    this.#connectPromise = this.#connectInternal().finally(() => {
      this.#connectPromise = null;
    });
    return this.#connectPromise;
  }

  async listThreads(cwd: string) {
    const response = (await this.request("thread/list", {
      cwd,
      archived: false,
      limit: 12,
    })) as { data: CodexThread[] };
    return response.data;
  }

  async readThread(threadId: string) {
    const response = (await this.request("thread/read", {
      threadId,
      includeTurns: true,
    })) as { thread: CodexThread };
    return response.thread;
  }

  async startThread(cwd: string) {
    const response = (await this.request("thread/start", {
      cwd,
      approvalPolicy: "on-request",
      sandbox: "workspace-write",
      experimentalRawEvents: false,
      persistExtendedHistory: true,
    })) as { thread: CodexThread };
    return response.thread;
  }

  async startTurn(threadId: string, body: string, cwd: string) {
    return this.request("turn/start", {
      threadId,
      cwd,
      input: [{ type: "text", text: body, text_elements: [] }],
    });
  }

  async interruptTurn(threadId: string, turnId: string) {
    return this.request("turn/interrupt", { threadId, turnId });
  }

  async close() {
    this.#socket?.close();
    this.#socket = null;
    this.#managedProcess?.kill();
    this.#managedProcess = null;
    this.#managedUrl = null;
  }

  async #connectInternal() {
    const endpoint = this.endpoint || (await this.#startManagedServer());
    const socket = await this.#openSocket(endpoint);
    this.#socket = socket;
    await this.request("initialize", {
      clientInfo: { name: "offdex-bridge", version: "0.1.0" },
      capabilities: { experimentalApi: true },
    });
    socket.send(JSON.stringify({ method: "initialized" }));
  }

  async #startManagedServer() {
    if (this.#managedUrl) {
      return this.#managedUrl;
    }

    this.#codexExecutable ??= await resolveCodexExecutable();
    const port = process.env.OFFDEX_CODEX_APP_SERVER_PORT
      ? Number(process.env.OFFDEX_CODEX_APP_SERVER_PORT)
      : await getFreePort();
    const wsUrl = `ws://127.0.0.1:${port}`;

    this.#managedProcess = Bun.spawn(
      [
        this.#codexExecutable,
        "app-server",
        "--listen",
        wsUrl,
        "--session-source",
        "appServer",
      ],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );
    await waitForReady(`http://127.0.0.1:${port}/readyz`);
    this.#managedUrl = wsUrl;
    return wsUrl;
  }

  async #openSocket(url: string) {
    return new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(url);

      socket.onopen = () => {
        resolve(socket);
      };

      socket.onerror = () => {
        reject(new Error(`Failed to connect to Codex app-server at ${url}`));
      };

      socket.onmessage = (event) => {
        this.#handleMessage(event.data);
      };

      socket.onclose = () => {
        this.#socket = null;
        for (const pending of this.#pending.values()) {
          pending.reject(new Error("Codex app-server disconnected."));
        }
        this.#pending.clear();
      };
    });
  }

  #handleMessage(rawData: string | ArrayBuffer | Blob | Buffer) {
    const text =
      typeof rawData === "string"
        ? rawData
        : rawData instanceof Buffer
          ? rawData.toString("utf8")
          : rawData instanceof ArrayBuffer
            ? Buffer.from(rawData).toString("utf8")
            : "";
    if (!text) {
      return;
    }

    const message = JSON.parse(text) as JsonRpcResponse | JsonRpcNotification | JsonRpcServerRequest;

    if ("id" in message && !("method" in message)) {
      const pending = this.#pending.get(Number(message.id));
      if (!pending) {
        return;
      }

      this.#pending.delete(Number(message.id));
      if (message.error) {
        pending.reject(new Error(message.error.message));
        return;
      }

      pending.resolve(message.result);
      return;
    }

    if ("id" in message && "method" in message) {
      this.#handleServerRequest(message);
      return;
    }

    if ("method" in message) {
      for (const listener of this.#listeners) {
        listener(message as CodexServerNotification);
      }
    }
  }

  #handleServerRequest(message: JsonRpcServerRequest) {
    const rejectDecision =
      message.method === "item/fileChange/requestApproval"
        ? { decision: "decline" }
        : message.method === "item/commandExecution/requestApproval"
          ? { decision: "decline" }
          : message.method === "item/permissions/requestApproval"
            ? { decision: "decline" }
            : message.method === "item/tool/requestUserInput"
              ? { answers: {} }
              : null;

    if (rejectDecision) {
      this.#socket?.send(JSON.stringify({ id: message.id, result: rejectDecision }));
      return;
    }

    this.#socket?.send(
      JSON.stringify({
        id: message.id,
        error: { code: -32601, message: `Unsupported server request: ${message.method}` },
      })
    );
  }

  async request(method: string, params: unknown) {
    await this.ensureConnected();
    const id = this.#nextId++;
    const socket = this.#socket;
    if (!socket) {
      throw new Error("Codex app-server is not connected.");
    }

    return new Promise<unknown>((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
}

export interface CodexBridgeRuntimeOptions {
  runtimeTarget: RuntimeTarget;
  workspaceStore: WorkspaceSnapshotStore;
  cwd: string;
}

export class CodexBridgeRuntime {
  #unsubscribe: (() => void) | null = null;
  #runtimeTarget: RuntimeTarget;
  readonly client = new CodexAppServerClient();

  constructor(
    private readonly options: CodexBridgeRuntimeOptions
  ) {
    this.#runtimeTarget = options.runtimeTarget;
  }

  get runtimeTarget() {
    return this.#runtimeTarget;
  }

  async refreshSnapshot() {
    await this.#ensureClient();
    const listed = await this.client.listThreads(this.options.cwd);
    const threads = await Promise.all(listed.map((thread) => this.client.readThread(thread.id)));
    const snapshot = createCodexSnapshot(
      this.#runtimeTarget,
      threads,
      this.options.workspaceStore.getSnapshot()
    );
    this.options.workspaceStore.replaceSnapshot(snapshot);
    return snapshot;
  }

  async setRuntimeTarget(runtimeTarget: RuntimeTarget) {
    this.#runtimeTarget = runtimeTarget;
    const snapshot = this.options.workspaceStore.getSnapshot();
    this.options.workspaceStore.replaceSnapshot({
      ...snapshot,
      pairing: {
        ...snapshot.pairing,
        runtimeTarget,
      },
    });
    return this.refreshSnapshot();
  }

  async sendTurn(threadId: string, body: string) {
    const trimmed = body.trim();
    if (!trimmed) {
      return this.options.workspaceStore.getSnapshot();
    }

    await this.#ensureClient();
    const snapshot = this.options.workspaceStore.getSnapshot();
    const needsNewThread =
      threadId === NEW_THREAD_ID || !snapshot.threads.some((thread) => thread.id === threadId);
    const targetThreadId = needsNewThread
      ? (await this.client.startThread(this.options.cwd)).id
      : threadId;

    await this.client.startTurn(targetThreadId, trimmed, this.options.cwd);
    return this.options.workspaceStore.getSnapshot();
  }

  async close() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    await this.client.close();
  }

  async #ensureClient() {
    await this.client.ensureConnected();

    if (this.#unsubscribe) {
      return;
    }

    this.#unsubscribe = this.client.subscribe((notification) => {
      const nextSnapshot = applyCodexNotification(
        this.options.workspaceStore.getSnapshot(),
        notification,
        this.#runtimeTarget
      );
      this.options.workspaceStore.replaceSnapshot(nextSnapshot);
    });
  }
}
