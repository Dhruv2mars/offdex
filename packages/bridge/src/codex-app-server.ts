import { existsSync } from "node:fs";
import { basename } from "node:path";
import { createServer } from "node:net";
import {
  OFFDEX_NEW_THREAD_ID,
  type OffdexApprovalRequest,
  type OffdexAppRecord,
  type OffdexConfigSummary,
  type OffdexGitInfo,
  type OffdexExperimentalFeatureRecord,
  type OffdexInputItem,
  type OffdexMcpServerRecord,
  type OffdexRateLimitsSummary,
  type OffdexRateLimitWindow,
  type OffdexModelRecord,
  type OffdexPermissionReview,
  type OffdexPluginRecord,
  type OffdexRemoteFileEntry,
  type OffdexRemoteFileMatch,
  type OffdexSkillRecord,
  type OffdexTimelineItem,
  type OffdexRuntimeAccount,
  type OffdexTurn,
  type OffdexWorkbenchInventory,
  WorkspaceSnapshotStore,
  makeDemoWorkspaceSnapshot,
  type OffdexMessage,
  type OffdexThread,
  type OffdexWorkspaceSnapshot,
  type RuntimeTarget,
} from "@offdex/protocol";

export const NEW_THREAD_ID = OFFDEX_NEW_THREAD_ID;

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

type CodexKnownThreadItem =
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
  | {
      type: "commandExecution";
      id: string;
      command: string;
      cwd?: string | null;
      processId?: string | null;
      source?: string | null;
      status?: string | null;
      commandActions?: ReadonlyArray<{
        type?: string;
        command?: string;
        name?: string;
        path?: string;
      }>;
      aggregatedOutput?: string | null;
      exitCode?: number | null;
      durationMs?: number | null;
    };

type CodexUnknownThreadItem = { type: string; id: string; [key: string]: unknown };

type CodexThreadItem = CodexKnownThreadItem | CodexUnknownThreadItem;

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
  | { method: "turn/diff/updated"; params: { threadId: string; turnId: string; diff: string } }
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
type TurnDiffUpdatedNotification = Extract<
  CodexServerNotification,
  { method: "turn/diff/updated" }
>;
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

export type CodexServerRequest = {
  id: number | string;
  method: string;
  params?: unknown;
};

type CodexAppInfo = {
  id: string;
  name: string;
  description?: string | null;
  distributionChannel?: string | null;
  installUrl?: string | null;
  isAccessible?: boolean;
  isEnabled?: boolean;
  logoUrl?: string | null;
  logoUrlDark?: string | null;
  labels?: Record<string, string> | null;
  branding?: {
    developer?: string | null;
    website?: string | null;
    category?: string | null;
  } | null;
};

type CodexModelInfo = {
  id: string;
  model: string;
  displayName: string;
  description: string;
  defaultReasoningEffort: string;
  supportedReasoningEfforts: Array<{ reasoningEffort?: string | null; description?: string | null } | string>;
  inputModalities?: string[];
  isDefault: boolean;
  hidden: boolean;
};

type CodexSkillListEntry = {
  cwd: string;
  errors: Array<{ message: string; path: string }>;
  skills: Array<{
    name: string;
    description: string;
    enabled: boolean;
    path: string;
    scope: "user" | "repo" | "system" | "admin";
    shortDescription?: string | null;
  }>;
};

type CodexPluginSummary = {
  id: string;
  name: string;
  enabled: boolean;
  installed: boolean;
  installPolicy: string;
  authPolicy: string;
  interface?: {
    category?: string | null;
    developerName?: string | null;
    displayName?: string | null;
    shortDescription?: string | null;
    longDescription?: string | null;
    websiteUrl?: string | null;
    capabilities?: string[];
  } | null;
  source?: {
    type: "local";
    path: string;
  } | null;
};

type CodexPluginMarketplace = {
  name: string;
  path: string;
  plugins: CodexPluginSummary[];
};

type CodexMcpServerStatus = {
  name: string;
  tools?: Record<string, unknown>;
  resources?: unknown[];
  resourceTemplates?: unknown[];
  authStatus?: string;
};

type CodexRateLimitWindow = {
  usedPercent?: number | null;
  windowDurationMins?: number | null;
  resetsAt?: number | null;
};

type CodexRateLimits = {
  limitId?: string | null;
  limitName?: string | null;
  planType?: string | null;
  primary?: CodexRateLimitWindow | null;
  secondary?: CodexRateLimitWindow | null;
  credits?: {
    hasCredits?: boolean;
    unlimited?: boolean;
    balance?: string | null;
  } | null;
};

type CodexExperimentalFeature = {
  name: string;
  stage?: string | null;
  displayName?: string | null;
  description?: string | null;
  announcement?: string | null;
  enabled?: boolean;
  defaultEnabled?: boolean;
};

type CodexConfig = {
  model?: string | null;
  model_provider?: string | null;
  model_reasoning_effort?: string | null;
  sandbox_mode?: string | null;
  approval_policy?: string | null;
  web_search?: string | null;
};

type CodexApprovalPolicy =
  | "untrusted"
  | "on-failure"
  | "on-request"
  | "never"
  | {
      granular: {
        mcp_elicitations: boolean;
        request_permissions: boolean;
        rules: boolean;
        sandbox_approval: boolean;
        skill_approval: boolean;
      };
    };

type CodexFsReadDirectoryEntry = {
  fileName: string;
  isDirectory: boolean;
  isFile: boolean;
};

type CodexFuzzyFileMatch = {
  file_name: string;
  path: string;
  root: string;
  match_type: "file" | "directory";
  score: number;
};

export type CodexAccountSummary = OffdexRuntimeAccount;

function codexApprovalPolicyFromConfig(config: CodexConfig | null): CodexApprovalPolicy | null {
  const policy = config?.approval_policy?.trim() ?? null;
  if (!policy) {
    return null;
  }

  if (policy === "on-request") {
    return {
      granular: {
        mcp_elicitations: true,
        request_permissions: true,
        rules: true,
        sandbox_approval: true,
        skill_approval: true,
      },
    };
  }

  if (policy === "untrusted" || policy === "on-failure" || policy === "never") {
    return policy;
  }

  return policy as CodexApprovalPolicy;
}

function codexSandboxFromConfig(config: CodexConfig | null) {
  const sandbox = config?.sandbox_mode?.trim() ?? null;
  return sandbox === "read-only" || sandbox === "workspace-write" || sandbox === "danger-full-access"
    ? sandbox
    : null;
}

function readStringField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function parseCodexAccountSummary(value: unknown): CodexAccountSummary {
  const record =
    value && typeof value === "object" && "account" in (value as Record<string, unknown>)
      ? ((value as Record<string, unknown>).account as Record<string, unknown> | null) ?? {}
      : value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : {};

  const email = readStringField(record, ["email", "emailAddress", "loginEmail"]);
  const name = readStringField(record, ["name", "displayName", "fullName"]);
  const id =
    readStringField(record, ["id", "accountId", "userId", "subject"]) ?? email ?? null;
  const planType = readStringField(record, ["planType", "plan", "tier"]);
  const authenticatedValue = record["isAuthenticated"] ?? record["authenticated"] ?? record["loggedIn"];

  return {
    id,
    email,
    name,
    planType,
    isAuthenticated: authenticatedValue === true || Boolean(email || name || id),
  };
}

function toIsoFromUnixSeconds(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value * 1000).toISOString() : null;
}

function mapRateLimitWindow(window: CodexRateLimitWindow | null | undefined): OffdexRateLimitWindow | null {
  if (!window) {
    return null;
  }

  return {
    usedPercent: typeof window.usedPercent === "number" ? window.usedPercent : null,
    windowDurationMins: typeof window.windowDurationMins === "number" ? window.windowDurationMins : null,
    resetsAt: toIsoFromUnixSeconds(window.resetsAt),
  };
}

function parseCodexRateLimits(value: unknown): OffdexRateLimitsSummary | null {
  const record =
    value && typeof value === "object" && "rateLimits" in (value as Record<string, unknown>)
      ? ((value as Record<string, unknown>).rateLimits as CodexRateLimits | null) ?? null
      : value && typeof value === "object"
        ? (value as CodexRateLimits)
        : null;

  if (!record) {
    return null;
  }

  return {
    limitId: typeof record.limitId === "string" ? record.limitId : null,
    limitName: typeof record.limitName === "string" ? record.limitName : null,
    planType: typeof record.planType === "string" ? record.planType : null,
    primary: mapRateLimitWindow(record.primary),
    secondary: mapRateLimitWindow(record.secondary),
    credits: record.credits
      ? {
          hasCredits: record.credits.hasCredits === true,
          unlimited: record.credits.unlimited === true,
          balance: typeof record.credits.balance === "string" ? record.credits.balance : null,
        }
      : null,
  };
}

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

function isMissingThreadError(error: unknown) {
  return error instanceof Error && /thread not found/i.test(error.message);
}

function projectLabelFromThread(thread: CodexThread) {
  return basename(thread.cwd) || "workspace";
}

function parseGitInfo(value: unknown): OffdexGitInfo | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  return {
    sha: typeof record.sha === "string" ? record.sha : null,
    branch: typeof record.branch === "string" ? record.branch : null,
    originUrl: typeof record.originUrl === "string" ? record.originUrl : null,
  };
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

function isUserMessageItem(
  item: CodexThreadItem
): item is Extract<CodexKnownThreadItem, { type: "userMessage" }> {
  return item.type === "userMessage" && Array.isArray((item as { content?: unknown }).content);
}

function isAgentMessageItem(
  item: CodexThreadItem
): item is Extract<CodexKnownThreadItem, { type: "agentMessage" }> {
  return item.type === "agentMessage" && typeof (item as { text?: unknown }).text === "string";
}

function isReasoningItem(
  item: CodexThreadItem
): item is Extract<CodexKnownThreadItem, { type: "reasoning" }> {
  return (
    item.type === "reasoning" &&
    Array.isArray((item as { summary?: unknown }).summary) &&
    Array.isArray((item as { content?: unknown }).content)
  );
}

function isPlanItem(
  item: CodexThreadItem
): item is Extract<CodexKnownThreadItem, { type: "plan" }> {
  return item.type === "plan" && typeof (item as { text?: unknown }).text === "string";
}

function isCommandExecutionItem(
  item: CodexThreadItem
): item is Extract<CodexKnownThreadItem, { type: "commandExecution" }> {
  return item.type === "commandExecution" && typeof (item as { command?: unknown }).command === "string";
}

function extractScalarText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function extractText(value: unknown): string | null {
  const scalar = extractScalarText(value);
  if (scalar) {
    return scalar;
  }

  if (Array.isArray(value)) {
    const joined = value
      .map((entry) => extractText(entry))
      .filter((entry): entry is string => Boolean(entry))
      .join("\n")
      .trim();
    return joined.length > 0 ? joined : null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of [
    "text",
    "message",
    "summary",
    "content",
    "output",
    "result",
    "query",
    "path",
    "command",
    "name",
    "title",
    "detail",
  ]) {
    const nested = extractText(record[key]);
    if (nested) {
      return nested;
    }
  }

  return JSON.stringify(value, null, 2);
}

function firstText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = extractText(record[key]);
    if (value) {
      return value;
    }
  }

  return null;
}

function firstNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function normalizeTimelineStatus(
  value: unknown,
  fallback: "pending" | "in_progress" | "completed" | "failed" | "interrupted"
) {
  if (value === "pending" || value === "in_progress" || value === "completed" || value === "failed" || value === "interrupted") {
    return value;
  }

  if (value === "inProgress" || value === "running" || value === "started") {
    return "in_progress";
  }

  if (value === "done" || value === "success" || value === "succeeded") {
    return "completed";
  }

  if (value === "cancelled" || value === "canceled" || value === "stopped") {
    return "interrupted";
  }

  return fallback;
}

function unknownItemToTimelineItem(item: CodexUnknownThreadItem): OffdexTimelineItem | null {
  const record = item as Record<string, unknown>;
  const itemType = item.type;

  if (itemType === "task_started" || itemType === "task_complete") {
    return {
      type: "taskLifecycle",
      id: item.id,
      label: itemType === "task_started" ? "Task started" : "Task complete",
      status: itemType === "task_started" ? "in_progress" : "completed",
      detail:
        firstText(record, ["last_agent_message", "message", "detail"]) ??
        firstText(record, ["turn_id", "turnId", "started_at", "completed_at"]),
    };
  }

  if (itemType === "token_count") {
    const rateLimits =
      record.rate_limits && typeof record.rate_limits === "object"
        ? (record.rate_limits as Record<string, unknown>)
        : null;
    const info = record.info && typeof record.info === "object" ? (record.info as Record<string, unknown>) : null;
    const totalUsage =
      info?.total_token_usage && typeof info.total_token_usage === "object"
        ? (info.total_token_usage as Record<string, unknown>)
        : null;
    const primary =
      rateLimits?.primary && typeof rateLimits.primary === "object"
        ? (rateLimits.primary as Record<string, unknown>)
        : null;
    const secondary =
      rateLimits?.secondary && typeof rateLimits.secondary === "object"
        ? (rateLimits.secondary as Record<string, unknown>)
        : null;
    const primaryPercent = firstNumber(primary ?? {}, ["used_percent"]);
    const secondaryPercent = firstNumber(secondary ?? {}, ["used_percent"]);
    const totalTokens = firstNumber(totalUsage ?? {}, ["total_tokens"]);
    const parts = [
      typeof totalTokens === "number" ? `${totalTokens.toLocaleString()} tokens` : null,
      typeof primaryPercent === "number" ? `${primaryPercent}% primary` : null,
      typeof secondaryPercent === "number" ? `${secondaryPercent}% weekly` : null,
      extractScalarText(rateLimits?.plan_type) ? `${extractScalarText(rateLimits?.plan_type)} plan` : null,
    ].filter((entry): entry is string => Boolean(entry));

    return {
      type: "tokenUsage",
      id: item.id,
      summary: parts.join(" · ") || "Token usage update",
      planType: extractScalarText(rateLimits?.plan_type),
      primaryPercent,
      secondaryPercent,
      totalTokens,
    };
  }

  if (
    itemType === "function_call" ||
    itemType === "function_call_output" ||
    itemType === "custom_tool_call" ||
    itemType === "custom_tool_call_output" ||
    itemType === "web_search_call" ||
    itemType === "search" ||
    itemType === "read" ||
    itemType === "patch_apply_end"
  ) {
    const toolName =
      firstText(record, ["name", "tool_name", "toolName", "title"]) ??
      (itemType === "web_search_call"
        ? "Web search"
        : itemType === "search"
          ? "Search"
          : itemType === "read"
            ? "Read file"
            : itemType === "patch_apply_end"
              ? "Apply patch"
              : itemType === "custom_tool_call" || itemType === "custom_tool_call_output"
                ? "Custom tool"
                : "Tool call");
    const source =
      itemType === "web_search_call" || itemType === "search"
        ? "search"
        : itemType === "read" || itemType === "patch_apply_end"
          ? "file"
          : itemType.includes("mcp")
            ? "mcp"
            : "tool";

    return {
      type: "toolActivity",
      id: item.id,
      toolName,
      status: normalizeTimelineStatus(
        record.status,
        itemType.endsWith("_output") || itemType.endsWith("_end") || itemType === "search" || itemType === "read"
          ? "completed"
          : "in_progress"
      ),
      source,
      summary:
        firstText(record, ["summary", "message", "title"]) ??
        (itemType === "patch_apply_end"
          ? "Patch application result"
          : itemType.endsWith("_output")
            ? "Tool result"
            : "Tool activity"),
      input: firstText(record, ["arguments", "args", "input", "query", "path", "command"]),
      output: firstText(record, ["output", "result", "content", "text", "message", "diff"]),
    };
  }

  return null;
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
  if (isUserMessageItem(item)) {
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

  if (isAgentMessageItem(item)) {
    return {
      id: item.id,
      role: "assistant",
      body: item.text,
      createdAt: updatedAtLabel,
    };
  }

  return null;
}

function threadItemToTimelineItem(item: CodexThreadItem): OffdexTimelineItem {
  if (isUserMessageItem(item)) {
    return {
      type: "userMessage",
      id: item.id,
      content: item.content.map((entry) => {
        switch (entry.type) {
          case "text":
            return { type: "text", text: entry.text };
          case "image":
            return { type: "image", url: entry.url };
          case "localImage":
            return { type: "localImage", path: entry.path };
          case "skill":
            return { type: "skill", name: entry.name, path: entry.path };
          case "mention":
            return { type: "mention", name: entry.name, path: entry.path };
        }
      }),
    };
  }

  if (isAgentMessageItem(item)) {
    return {
      type: "agentMessage",
      id: item.id,
      text: item.text,
      phase: item.phase ?? null,
    };
  }

  if (isReasoningItem(item)) {
    return {
      type: "reasoning",
      id: item.id,
      summary: [...item.summary],
      content: [...item.content],
    };
  }

  if (isPlanItem(item)) {
    return {
      type: "plan",
      id: item.id,
      text: item.text,
    };
  }

  if (isCommandExecutionItem(item)) {
    return {
      type: "commandExecution",
      id: item.id,
      command: item.command,
      cwd: item.cwd ?? null,
      status:
        item.status === "completed" ||
        item.status === "failed" ||
        item.status === "interrupted" ||
        item.status === "pending"
          ? item.status
          : "in_progress",
      aggregatedOutput: item.aggregatedOutput ?? "",
      exitCode: item.exitCode ?? null,
      durationMs: item.durationMs ?? null,
      source: item.source ?? null,
      processId: item.processId ?? null,
      actions: (item.commandActions ?? []).map((action) => ({
        type: action.type ?? "unknown",
        command: action.command,
        name: action.name,
        path: action.path,
      })),
    };
  }

  const normalizedUnknown = unknownItemToTimelineItem(item as CodexUnknownThreadItem);
  if (normalizedUnknown) {
    return normalizedUnknown;
  }

  return {
    type: "unknown",
    id: item.id,
    label: item.type,
    data: JSON.stringify(item, null, 2),
  };
}

function codexTurnToOffdexTurn(turn: CodexTurn): OffdexTurn {
  return {
    id: turn.id,
    status: turn.status,
    errorMessage:
      turn.error instanceof Error
        ? turn.error.message
        : typeof turn.error === "string"
          ? turn.error
          : turn.error
            ? JSON.stringify(turn.error)
            : null,
    items: turn.items.map(threadItemToTimelineItem),
    diff: null,
  };
}

function existingTurnDiff(
  snapshot: OffdexWorkspaceSnapshot,
  threadId: string,
  turnId: string
) {
  return (
    snapshot.threads
      .find((thread) => thread.id === threadId)
      ?.turns.find((turn) => turn.id === turnId)
      ?.diff ?? null
  );
}

function sortThreadsByUpdatedAt(threads: CodexThread[]) {
  return [...threads].sort((left, right) => right.updatedAt - left.updatedAt);
}

export function findActiveTurnId(thread: CodexThread) {
  return [...thread.turns].reverse().find((turn) => turn.status === "inProgress")?.id ?? null;
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
    path: null,
    cwd: null,
    cliVersion: null,
    source: "bridge",
    agentNickname: null,
    agentRole: null,
    gitInfo: null,
    messages: [],
    turns: [],
  };
}

export function mapCodexThreadToOffdexThread(
  thread: CodexThread,
  runtimeTarget: RuntimeTarget,
  seedSnapshot?: OffdexWorkspaceSnapshot
): OffdexThread {
  const updatedAtLabel = formatUpdatedAt(thread.updatedAt);
  const turns = thread.turns.map((turn) => ({
    ...codexTurnToOffdexTurn(turn),
    diff: seedSnapshot ? existingTurnDiff(seedSnapshot, thread.id, turn.id) : null,
  }));
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
    path: thread.path,
    cwd: thread.cwd,
    cliVersion: thread.cliVersion,
    source: thread.source,
    agentNickname: thread.agentNickname,
    agentRole: thread.agentRole,
    gitInfo: parseGitInfo(thread.gitInfo),
    messages,
    turns,
  };
}

export function createCodexSnapshot(
  runtimeTarget: RuntimeTarget,
  threads: CodexThread[],
  archivedThreads: CodexThread[] = [],
  seedSnapshot: OffdexWorkspaceSnapshot = makeDemoWorkspaceSnapshot(runtimeTarget)
): OffdexWorkspaceSnapshot {
  const mappedThreads = sortThreadsByUpdatedAt(threads).map((thread) =>
    mapCodexThreadToOffdexThread(thread, runtimeTarget, seedSnapshot)
  );
  const mappedArchivedThreads = sortThreadsByUpdatedAt(archivedThreads).map((thread) =>
    mapCodexThreadToOffdexThread(thread, runtimeTarget, seedSnapshot)
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
    archivedThreads: mappedArchivedThreads,
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
    path: null,
    cwd: null,
    cliVersion: null,
    source: "bridge",
    agentNickname: null,
    agentRole: null,
    gitInfo: null,
    messages: [],
    turns: [],
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

function ensureTurn(thread: OffdexThread, turnId: string) {
  const existing = thread.turns.find((turn) => turn.id === turnId);
  if (existing) {
    return existing;
  }

  const turn: OffdexTurn = {
    id: turnId,
    status: "inProgress",
    errorMessage: null,
    items: [],
    diff: null,
  };
  thread.turns.push(turn);
  return turn;
}

function upsertTimelineItem(turn: OffdexTurn, item: OffdexTimelineItem) {
  const existingIndex = turn.items.findIndex((entry) => entry.id === item.id);
  if (existingIndex >= 0) {
    turn.items[existingIndex] = item;
    return;
  }

  turn.items.push(item);
}

function mergeAgentDelta(
  snapshot: OffdexWorkspaceSnapshot,
  threadId: string,
  turnId: string,
  itemId: string,
  delta: string,
  runtimeTarget: RuntimeTarget
) {
  const thread = ensureThread(snapshot, threadId, runtimeTarget);
  const turn = ensureTurn(thread, turnId);
  thread.state = "running";
  thread.updatedAt = "Now";
  const existing = thread.messages.find((message) => message.id === itemId);

  if (existing) {
    existing.body += delta;
  } else {
    thread.messages.push({
      id: itemId,
      role: "assistant",
      body: delta,
      createdAt: "Now",
    });
  }

  const existingTimelineItem = turn.items.find((item) => item.id === itemId);
  if (existingTimelineItem?.type === "agentMessage") {
    existingTimelineItem.text += delta;
    return;
  }

  upsertTimelineItem(turn, {
    type: "agentMessage",
    id: itemId,
    text: delta,
    phase: "commentary",
  });
}

function applyItemUpdate(
  snapshot: OffdexWorkspaceSnapshot,
  threadId: string,
  turnId: string,
  item: CodexThreadItem,
  runtimeTarget: RuntimeTarget
) {
  const thread = ensureThread(snapshot, threadId, runtimeTarget);
  const turn = ensureTurn(thread, turnId);
  const message = threadItemToMessage(item, "Now");
  const timelineItem = threadItemToTimelineItem(item);
  upsertTimelineItem(turn, timelineItem);
  if (message) {
    upsertMessage(thread, message);
  }

  thread.state = item.type === "agentMessage" ? "running" : thread.state;
  thread.updatedAt = "Now";
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
    case "thread/archived": {
      const paramsRecord =
        notification.params && typeof notification.params === "object"
          ? (notification.params as Record<string, unknown>)
          : {};
      const threadRecord =
        paramsRecord.thread && typeof paramsRecord.thread === "object"
          ? (paramsRecord.thread as CodexThread)
          : null;
      const threadId =
        threadRecord?.id ?? (typeof paramsRecord.threadId === "string" ? paramsRecord.threadId : null);
      if (!threadId) {
        return next;
      }

      const archivedThread =
        threadRecord ??
        next.threads.find((thread) => thread.id === threadId) ??
        next.archivedThreads.find((thread) => thread.id === threadId);
      if (!archivedThread) {
        return next;
      }

      const mapped =
        "preview" in archivedThread
          ? mapCodexThreadToOffdexThread(archivedThread as CodexThread, runtimeTarget, next)
          : { ...(archivedThread as OffdexThread), updatedAt: "Now" };
      next.threads = next.threads.filter((thread) => thread.id !== threadId);
      next.archivedThreads = [mapped, ...next.archivedThreads.filter((thread) => thread.id !== threadId)].slice(0, 24);
      return next;
    }
    case "thread/unarchived": {
      const paramsRecord =
        notification.params && typeof notification.params === "object"
          ? (notification.params as Record<string, unknown>)
          : {};
      const threadRecord =
        paramsRecord.thread && typeof paramsRecord.thread === "object"
          ? (paramsRecord.thread as CodexThread)
          : null;
      const threadId =
        threadRecord?.id ?? (typeof paramsRecord.threadId === "string" ? paramsRecord.threadId : null);
      if (!threadId) {
        return next;
      }

      next.archivedThreads = next.archivedThreads.filter((thread) => thread.id !== threadId);
      if (threadRecord) {
        upsertThread(next, mapCodexThreadToOffdexThread(threadRecord, runtimeTarget, next));
      }
      return next;
    }
    case "thread/status/changed": {
      const payload = (notification as ThreadStatusChangedNotification).params;
      const thread = ensureThread(next, payload.threadId, runtimeTarget);
      thread.state = threadStatusToState(payload.status, thread.messages.length);
      thread.updatedAt = "Now";
      return next;
    }
    case "thread/compacted": {
      const paramsRecord =
        notification.params && typeof notification.params === "object"
          ? (notification.params as Record<string, unknown>)
          : {};
      const threadId = typeof paramsRecord.threadId === "string" ? paramsRecord.threadId : null;
      if (!threadId) {
        return next;
      }

      const thread = ensureThread(next, threadId, runtimeTarget);
      thread.updatedAt = "Now";
      return next;
    }
    case "turn/started": {
      const payload = (notification as TurnStartedNotification).params;
      const thread = ensureThread(next, payload.threadId, runtimeTarget);
      const turn = ensureTurn(thread, payload.turn.id);
      thread.state = "running";
      thread.updatedAt = "Now";
      turn.status = payload.turn.status;
      return next;
    }
    case "turn/completed": {
      const payload = (notification as TurnCompletedNotification).params;
      const thread = ensureThread(next, payload.threadId, runtimeTarget);
      thread.state = turnStatusToState(payload.turn.status);
      thread.updatedAt = "Now";
      const turn = ensureTurn(thread, payload.turn.id);
      turn.status = payload.turn.status;
      turn.errorMessage =
        payload.turn.error instanceof Error
          ? payload.turn.error.message
          : typeof payload.turn.error === "string"
            ? payload.turn.error
            : payload.turn.error
              ? JSON.stringify(payload.turn.error)
              : null;
      return next;
    }
    case "turn/diff/updated": {
      const payload = (notification as TurnDiffUpdatedNotification).params;
      const thread = ensureThread(next, payload.threadId, runtimeTarget);
      const turn = ensureTurn(thread, payload.turnId);
      turn.diff = payload.diff;
      thread.updatedAt = "Now";
      return next;
    }
    case "item/started": {
      const payload = (notification as ItemStartedNotification).params;
      applyItemUpdate(next, payload.threadId, payload.turnId, payload.item, runtimeTarget);
      return next;
    }
    case "item/completed": {
      const payload = (notification as ItemCompletedNotification).params;
      applyItemUpdate(next, payload.threadId, payload.turnId, payload.item, runtimeTarget);
      return next;
    }
    case "item/autoApprovalReview/started": {
      const review = permissionReviewFromNotification(notification, "running");
      if (!review) {
        return next;
      }

      upsertPermissionReviewSnapshot(next, review);
      if (review.threadId && review.turnId) {
        const thread = ensureThread(next, review.threadId, runtimeTarget);
        const turn = ensureTurn(thread, review.turnId);
        thread.updatedAt = "Now";
        upsertTimelineItem(turn, {
          type: "unknown",
          id: review.id,
          label: "permission review",
          data: review.detail,
        });
      }
      return next;
    }
    case "item/autoApprovalReview/completed": {
      const review = permissionReviewFromNotification(notification, "completed");
      if (!review) {
        return next;
      }

      upsertPermissionReviewSnapshot(next, review);
      if (review.threadId && review.turnId) {
        const thread = ensureThread(next, review.threadId, runtimeTarget);
        const turn = ensureTurn(thread, review.turnId);
        thread.updatedAt = "Now";
        upsertTimelineItem(turn, {
          type: "unknown",
          id: review.id,
          label: "permission review",
          data: review.outcome ? `${review.detail}\n\nOutcome: ${review.outcome}` : review.detail,
        });
      }
      return next;
    }
    case "item/agentMessage/delta": {
      const payload = (notification as AgentDeltaNotification).params;
      mergeAgentDelta(
        next,
        payload.threadId,
        payload.turnId,
        payload.itemId,
        payload.delta,
        runtimeTarget
      );
      return next;
    }
    case "serverRequest/resolved": {
      const paramsRecord =
        notification.params && typeof notification.params === "object"
          ? (notification.params as Record<string, unknown>)
          : null;
      const requestId = paramsRecord ? readStringField(paramsRecord, ["requestId", "serverRequestId", "id"]) : null;
      if (!requestId) {
        return next;
      }

      const resolutionSource =
        paramsRecord?.result ??
        paramsRecord?.response ??
        paramsRecord?.resolution ??
        paramsRecord?.status ??
        paramsRecord;
      applyApprovalResolution(next, requestId, approvalStatusFromValue(resolutionSource));
      return next;
    }
    case "error": {
      const payload = (notification as ErrorNotification).params;
      const thread = ensureThread(next, payload.threadId, runtimeTarget);
      const turn = ensureTurn(thread, payload.turnId);
      thread.state = payload.willRetry ? "running" : "failed";
      thread.updatedAt = "Now";
      turn.status = payload.willRetry ? "inProgress" : "failed";
      turn.errorMessage =
        payload.error instanceof Error
          ? payload.error.message
          : typeof payload.error === "string"
            ? payload.error
            : payload.error
              ? JSON.stringify(payload.error)
              : "Codex hit an error on this turn.";
      thread.messages.push({
        id: `${payload.turnId}-error`,
        role: "system",
        body: "Codex hit an error on this turn.",
        createdAt: "Now",
      });
      upsertTimelineItem(turn, {
        type: "unknown",
        id: `${payload.turnId}-error`,
        label: "error",
        data: turn.errorMessage,
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

function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function readRecordField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  return null;
}

function approvalStatusFromValue(value: unknown): "approved" | "declined" {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (
      normalized.includes("declin") ||
      normalized.includes("denied") ||
      normalized.includes("reject") ||
      normalized.includes("cancel")
    ) {
      return "declined";
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const nestedStatus =
      readStringField(record, ["status", "decision", "action", "resolution", "outcome"]) ??
      readStringField(readRecordField(record, ["result", "response", "resolution"]) ?? {}, [
        "status",
        "decision",
        "action",
        "resolution",
        "outcome",
      ]);
    if (nestedStatus) {
      return approvalStatusFromValue(nestedStatus);
    }
  }

  return "approved";
}

function applyApprovalResolution(
  snapshot: OffdexWorkspaceSnapshot,
  requestId: string,
  status: "approved" | "declined"
) {
  snapshot.pendingApprovals = snapshot.pendingApprovals.map((approval) =>
    approval.id === requestId ? { ...approval, status } : approval
  );
}

function reviewOutcomeFromValue(value: unknown): OffdexPermissionReview["outcome"] {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (
      normalized.includes("declin") ||
      normalized.includes("denied") ||
      normalized.includes("reject") ||
      normalized.includes("block") ||
      normalized.includes("cancel")
    ) {
      return "declined";
    }
    if (
      normalized.includes("approv") ||
      normalized.includes("accept") ||
      normalized.includes("allow") ||
      normalized.includes("pass") ||
      normalized.includes("success") ||
      normalized.includes("complete")
    ) {
      return "approved";
    }
    return "unknown";
  }

  if (typeof value === "boolean") {
    return value ? "approved" : "declined";
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const nestedStatus =
      readStringField(record, ["status", "decision", "action", "resolution", "outcome"]) ??
      readStringField(readRecordField(record, ["result", "review", "response"]) ?? {}, [
        "status",
        "decision",
        "action",
        "resolution",
        "outcome",
      ]);
    return nestedStatus ? reviewOutcomeFromValue(nestedStatus) : "unknown";
  }

  return null;
}

function upsertPermissionReviewSnapshot(
  snapshot: OffdexWorkspaceSnapshot,
  review: OffdexPermissionReview
) {
  const existingIndex = snapshot.permissionReviews.findIndex((entry) => entry.id === review.id);
  if (existingIndex >= 0) {
    snapshot.permissionReviews[existingIndex] = review;
  } else {
    snapshot.permissionReviews.unshift(review);
    snapshot.permissionReviews = snapshot.permissionReviews.slice(0, 8);
  }
}

function permissionReviewFromNotification(
  notification: CodexServerNotification,
  status: OffdexPermissionReview["status"]
) {
  if (!notification.params || typeof notification.params !== "object") {
    return null;
  }

  const paramsRecord = notification.params as Record<string, unknown>;
  const threadId = readStringField(paramsRecord, ["threadId", "conversationId"]);
  const turnId = readStringField(paramsRecord, ["turnId"]);
  const itemId = readStringField(paramsRecord, ["itemId", "reviewId", "id", "requestId"]);
  const id = itemId ?? [threadId ?? "thread", turnId ?? "turn", notification.method].join(":");
  const summary =
    readStringField(paramsRecord, ["summary", "message", "detail", "reason", "statusMessage"]) ??
    (status === "running"
      ? "Codex is reviewing whether this permission request can be auto-approved."
      : "Codex completed its permission review.");

  return {
    id,
    threadId,
    turnId,
    title: status === "running" ? "Permission review in progress" : "Permission review completed",
    detail: summary,
    status,
    outcome:
      status === "completed"
        ? reviewOutcomeFromValue(
            readRecordField(paramsRecord, ["result", "review", "response"]) ??
              readStringField(paramsRecord, ["status", "decision", "action", "outcome"]) ??
              paramsRecord
          )
        : null,
    updatedAt: new Date().toISOString(),
  } satisfies OffdexPermissionReview;
}

function formatServerRequestDetail(method: string, paramsRecord: Record<string, unknown>) {
  if (method === "item/commandExecution/requestApproval") {
    const lines = [
      typeof paramsRecord.reason === "string" && paramsRecord.reason.trim()
        ? `Reason: ${paramsRecord.reason.trim()}`
        : null,
      typeof paramsRecord.command === "string" && paramsRecord.command.trim()
        ? `Command: ${paramsRecord.command.trim()}`
        : null,
      typeof paramsRecord.cwd === "string" && paramsRecord.cwd.trim()
        ? `Working directory: ${paramsRecord.cwd.trim()}`
        : null,
    ].filter((entry): entry is string => Boolean(entry));

    const networkContext = paramsRecord.networkApprovalContext;
    if (networkContext) {
      lines.push(`Network context:\n${prettyJson(networkContext)}`);
    }

    const commandActions = paramsRecord.commandActions;
    if (commandActions) {
      lines.push(`Command actions:\n${prettyJson(commandActions)}`);
    }

    return lines.join("\n\n") || prettyJson(paramsRecord);
  }

  if (method === "execCommandApproval") {
    const command =
      Array.isArray(paramsRecord.command) && paramsRecord.command.every((entry) => typeof entry === "string")
        ? (paramsRecord.command as string[]).join(" ")
        : null;
    const lines = [
      typeof paramsRecord.reason === "string" && paramsRecord.reason.trim()
        ? `Reason: ${paramsRecord.reason.trim()}`
        : null,
      command ? `Command: ${command}` : null,
      typeof paramsRecord.cwd === "string" && paramsRecord.cwd.trim()
        ? `Working directory: ${paramsRecord.cwd.trim()}`
        : null,
      paramsRecord.parsedCmd ? `Command actions:\n${prettyJson(paramsRecord.parsedCmd)}` : null,
    ].filter((entry): entry is string => Boolean(entry));

    return lines.join("\n\n") || prettyJson(paramsRecord);
  }

  if (method === "item/fileChange/requestApproval") {
    const lines = [
      typeof paramsRecord.reason === "string" && paramsRecord.reason.trim()
        ? `Reason: ${paramsRecord.reason.trim()}`
        : null,
      typeof paramsRecord.grantRoot === "string" && paramsRecord.grantRoot.trim()
        ? `Requested write root: ${paramsRecord.grantRoot.trim()}`
        : null,
    ].filter((entry): entry is string => Boolean(entry));

    return lines.join("\n\n") || prettyJson(paramsRecord);
  }

  if (method === "applyPatchApproval") {
    const lines = [
      typeof paramsRecord.reason === "string" && paramsRecord.reason.trim()
        ? `Reason: ${paramsRecord.reason.trim()}`
        : null,
      typeof paramsRecord.grantRoot === "string" && paramsRecord.grantRoot.trim()
        ? `Requested write root: ${paramsRecord.grantRoot.trim()}`
        : null,
      paramsRecord.fileChanges ? `Requested file changes:\n${prettyJson(paramsRecord.fileChanges)}` : null,
    ].filter((entry): entry is string => Boolean(entry));

    return lines.join("\n\n") || prettyJson(paramsRecord);
  }

  if (method === "item/permissions/requestApproval") {
    const lines = [
      typeof paramsRecord.reason === "string" && paramsRecord.reason.trim()
        ? `Reason: ${paramsRecord.reason.trim()}`
        : null,
      paramsRecord.permissions ? `Requested permissions:\n${prettyJson(paramsRecord.permissions)}` : null,
    ].filter((entry): entry is string => Boolean(entry));

    return lines.join("\n\n") || prettyJson(paramsRecord);
  }

  if (method === "item/tool/requestUserInput") {
    const lines = [
      Array.isArray(paramsRecord.questions)
        ? `Questions:\n${prettyJson(paramsRecord.questions)}`
        : null,
    ].filter((entry): entry is string => Boolean(entry));
    return lines.join("\n\n") || prettyJson(paramsRecord);
  }

  if (method === "mcpServer/elicitation/request") {
    const lines = [
      typeof paramsRecord.serverName === "string" && paramsRecord.serverName.trim()
        ? `Connector: ${paramsRecord.serverName.trim()}`
        : null,
      typeof paramsRecord.message === "string" && paramsRecord.message.trim()
        ? `Message: ${paramsRecord.message.trim()}`
        : null,
      typeof paramsRecord.mode === "string" && paramsRecord.mode.trim()
        ? `Mode: ${paramsRecord.mode.trim()}`
        : null,
      paramsRecord.requestedSchema ? `Requested input:\n${prettyJson(paramsRecord.requestedSchema)}` : null,
      typeof paramsRecord.url === "string" && paramsRecord.url.trim()
        ? `Open URL: ${paramsRecord.url.trim()}`
        : null,
    ].filter((entry): entry is string => Boolean(entry));
    return lines.join("\n\n") || prettyJson(paramsRecord);
  }

  return prettyJson(paramsRecord);
}

function serverRequestToApproval(request: CodexServerRequest): OffdexApprovalRequest {
  const paramsRecord =
    request.params && typeof request.params === "object"
      ? (request.params as Record<string, unknown>)
      : {};
  const threadId =
    typeof paramsRecord.threadId === "string"
      ? paramsRecord.threadId
      : typeof paramsRecord.conversationId === "string"
        ? paramsRecord.conversationId
        : null;
  const turnId = typeof paramsRecord.turnId === "string" ? paramsRecord.turnId : null;
  const title =
    request.method === "item/commandExecution/requestApproval"
      ? "Command permission"
      : request.method === "execCommandApproval"
        ? "Command permission"
      : request.method === "item/fileChange/requestApproval"
        ? "File permission"
        : request.method === "applyPatchApproval"
          ? "File permission"
        : request.method === "item/permissions/requestApproval"
          ? "Permissions required"
          : request.method === "item/tool/requestUserInput"
            ? "Tool input required"
            : request.method === "mcpServer/elicitation/request"
              ? "Connector input required"
              : "Action required";

  return {
    id: String(request.id),
    method: request.method,
    title,
    detail: formatServerRequestDetail(request.method, paramsRecord),
    threadId,
    turnId,
    createdAt: new Date().toISOString(),
    status: "pending",
    inputSchema:
      request.method === "item/tool/requestUserInput" ||
      request.method === "mcpServer/elicitation/request"
        ? "answers"
        : "decision",
    rawParams: prettyJson(paramsRecord),
  };
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
  #serverRequestListeners = new Set<(request: CodexServerRequest) => void>();
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

  subscribeToServerRequests(listener: (request: CodexServerRequest) => void) {
    this.#serverRequestListeners.add(listener);
    return () => {
      this.#serverRequestListeners.delete(listener);
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

  async listThreads(cwd: string, options?: { archived?: boolean; limit?: number }) {
    const response = (await this.request("thread/list", {
      cwd,
      archived: options?.archived === true,
      limit: options?.limit ?? 12,
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

  async resumeThread(threadId: string) {
    const response = (await this.request("thread/resume", {
      threadId,
    })) as { thread: CodexThread };
    return response.thread;
  }

  async startThread(cwd: string, config?: CodexConfig | null) {
    const response = (await this.request("thread/start", {
      cwd,
      approvalPolicy: codexApprovalPolicyFromConfig(config ?? null),
      sandbox: codexSandboxFromConfig(config ?? null),
      experimentalRawEvents: false,
      persistExtendedHistory: true,
    })) as { thread: CodexThread };
    return response.thread;
  }

  async startTurn(
    threadId: string,
    body: string,
    cwd: string,
    inputs?: OffdexInputItem[],
    config?: CodexConfig | null
  ) {
    return this.request("turn/start", {
      threadId,
      cwd,
      approvalPolicy: codexApprovalPolicyFromConfig(config ?? null),
      input:
        inputs && inputs.length > 0
          ? inputs.map((input) =>
              input.type === "text"
                ? { type: "text", text: input.text, text_elements: [] }
                : input
            )
          : [{ type: "text", text: body, text_elements: [] }],
    });
  }

  async interruptTurn(threadId: string, turnId: string) {
    return this.request("turn/interrupt", { threadId, turnId });
  }

  async listApps(threadId?: string) {
    const response = (await this.request("app/list", {
      threadId: threadId ?? null,
      forceRefetch: false,
      limit: 100,
    })) as { data?: CodexAppInfo[] };
    return response.data ?? [];
  }

  async listModels() {
    const response = (await this.request("model/list", {
      limit: 100,
    })) as { data?: CodexModelInfo[] };
    return response.data ?? [];
  }

  async readConfig(cwd?: string) {
    const response = (await this.request("config/read", {
      cwd: cwd ?? null,
      includeLayers: false,
    })) as { config?: CodexConfig | null };
    return response.config ?? null;
  }

  async writeConfigValue(keyPath: string, value: unknown, filePath?: string | null) {
    const response = (await this.request("config/value/write", {
      keyPath,
      mergeStrategy: "upsert",
      value,
      filePath: filePath ?? null,
    })) as { filePath: string; status: string; version: string };
    return response;
  }

  async readDirectory(path: string) {
    const response = (await this.request("fs/readDirectory", {
      path,
    })) as { entries?: CodexFsReadDirectoryEntry[] };
    return response.entries ?? [];
  }

  async searchFiles(query: string, roots: string[]) {
    const response = (await this.request("fuzzyFileSearch", {
      query,
      roots,
    })) as { files?: CodexFuzzyFileMatch[] };
    return response.files ?? [];
  }

  async listSkills(cwd: string) {
    const response = (await this.request("skills/list", {
      cwds: [cwd],
      forceReload: false,
    })) as { data?: CodexSkillListEntry[] };
    return response.data ?? [];
  }

  async writeSkillConfig(input: { name?: string | null; path?: string | null; enabled: boolean }) {
    const selector =
      input.path?.trim()
        ? { path: input.path.trim(), name: null }
        : input.name?.trim()
          ? { name: input.name.trim(), path: null }
          : { name: null, path: null };
    const response = (await this.request("skills/config/write", {
      name: selector.name,
      path: selector.path,
      enabled: input.enabled,
    })) as { effectiveEnabled: boolean };
    return response;
  }

  async listPlugins(cwd: string) {
    const response = (await this.request("plugin/list", {
      cwds: [cwd],
      forceRemoteSync: false,
    })) as { marketplaces?: CodexPluginMarketplace[] };
    return response.marketplaces ?? [];
  }

  async installPlugin(marketplacePath: string, pluginName: string) {
    return this.request("plugin/install", {
      marketplacePath,
      pluginName,
    });
  }

  async uninstallPlugin(pluginId: string) {
    return this.request("plugin/uninstall", {
      pluginId,
    });
  }

  async listMcpServers() {
    const response = (await this.request("mcpServerStatus/list", {
      cursor: null,
      limit: 100,
    })) as { data?: CodexMcpServerStatus[] };
    return response.data ?? [];
  }

  async startMcpOauthLogin(name: string) {
    const response = (await this.request("mcpServer/oauth/login", {
      name,
    })) as { authorizationUrl: string };
    return response.authorizationUrl;
  }

  async startReview(threadId: string) {
    const response = (await this.request("review/start", {
      threadId,
      target: { type: "uncommittedChanges" },
      delivery: "inline",
    })) as { turn: CodexTurn; reviewThreadId: string };
    return response;
  }

  async setThreadName(threadId: string, name: string) {
    await this.request("thread/setName", { threadId, name });
  }

  async forkThread(threadId: string) {
    const response = (await this.request("thread/fork", {
      threadId,
      ephemeral: false,
    })) as { thread: CodexThread };
    return response.thread;
  }

  async archiveThread(threadId: string) {
    await this.request("thread/archive", { threadId });
  }

  async unarchiveThread(threadId: string) {
    const response = (await this.request("thread/unarchive", { threadId })) as { thread?: CodexThread };
    return response.thread ?? null;
  }

  async compactThread(threadId: string) {
    return this.request("thread/compact/start", { threadId });
  }

  async readAccount() {
    return parseCodexAccountSummary(await this.request("account/read", {}));
  }

  async readRateLimits() {
    return parseCodexRateLimits(await this.request("account/rateLimits/read", {}));
  }

  async listExperimentalFeatures() {
    const response = (await this.request("experimentalFeature/list", {
      limit: 100,
    })) as { data?: CodexExperimentalFeature[] };
    return response.data ?? [];
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

    const message = JSON.parse(text) as JsonRpcResponse | JsonRpcNotification | CodexServerRequest;

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

  #handleServerRequest(message: CodexServerRequest) {
    if (this.#serverRequestListeners.size > 0) {
      for (const listener of this.#serverRequestListeners) {
        listener(message);
      }
      return;
    }

    const rejectDecision =
      message.method === "item/fileChange/requestApproval"
        ? { decision: "decline" }
        : message.method === "item/commandExecution/requestApproval"
          ? { decision: "decline" }
          : message.method === "applyPatchApproval"
            ? { decision: "denied" }
            : message.method === "execCommandApproval"
              ? { decision: "denied" }
          : message.method === "item/permissions/requestApproval"
            ? { decision: "decline" }
            : message.method === "item/tool/requestUserInput"
              ? { answers: {} }
              : message.method === "mcpServer/elicitation/request"
                ? { action: "cancel" }
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

  respondToServerRequest(id: number | string, result: unknown) {
    this.#socket?.send(JSON.stringify({ id, result }));
  }

  rejectServerRequest(id: number | string, message: string) {
    this.#socket?.send(
      JSON.stringify({
        id,
        error: { code: -32601, message },
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
  #unsubscribeServerRequests: (() => void) | null = null;
  #runtimeTarget: RuntimeTarget;
  #activeTurnIdByThread = new Map<string, string>();
  #pendingServerRequests = new Map<string, CodexServerRequest>();
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
    const [listed, archivedListed] = await Promise.all([
      this.client.listThreads(this.options.cwd),
      this.client.listThreads(this.options.cwd, { archived: true, limit: 24 }).catch(() => []),
    ]);
    const threads = await Promise.all(listed.map((thread) => this.client.readThread(thread.id)));
    const account = await this.client.readAccount().catch(() => null);
    this.#activeTurnIdByThread = new Map(
      threads
        .map((thread) => [thread.id, findActiveTurnId(thread)] as const)
        .filter((entry): entry is readonly [string, string] => Boolean(entry[1]))
    );
    const snapshot = createCodexSnapshot(
      this.#runtimeTarget,
      threads,
      archivedListed,
      this.options.workspaceStore.getSnapshot()
    );
    snapshot.account = account;
    this.options.workspaceStore.replaceSnapshot(snapshot);
    return snapshot;
  }

  async readAccountSummary() {
    await this.#ensureClient();
    const account = await this.client.readAccount();
    this.options.workspaceStore.updateAccount(account);
    return account;
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

  async sendTurn(threadId: string, body: string, inputs?: OffdexInputItem[]) {
    const trimmed = body.trim();
    if (!trimmed && (!inputs || inputs.length === 0)) {
      return this.options.workspaceStore.getSnapshot();
    }

    await this.#ensureClient();
    const runtimeConfig = await this.client.readConfig(this.options.cwd).catch(() => null);
    const snapshot = this.options.workspaceStore.getSnapshot();
    const needsNewThread =
      threadId === NEW_THREAD_ID || !snapshot.threads.some((thread) => thread.id === threadId);
    let targetThreadId = needsNewThread
      ? (await this.client.startThread(this.options.cwd, runtimeConfig)).id
      : threadId;
    let replacedStaleThread = false;

    try {
      await this.client.startTurn(targetThreadId, trimmed, this.options.cwd, inputs, runtimeConfig);
    } catch (error) {
      if (!needsNewThread && isMissingThreadError(error)) {
        targetThreadId = (await this.client.startThread(this.options.cwd, runtimeConfig)).id;
        replacedStaleThread = true;
        await this.client.startTurn(targetThreadId, trimmed, this.options.cwd, inputs, runtimeConfig);
      } else {
        throw error;
      }
    }

    const nextSnapshot = this.options.workspaceStore.getSnapshot();
    if (replacedStaleThread) {
      nextSnapshot.threads = nextSnapshot.threads.filter((thread) => thread.id !== threadId);
    }
    const thread = ensureThread(nextSnapshot, targetThreadId, this.#runtimeTarget);

    if ((needsNewThread || replacedStaleThread) && thread.messages.length === 0) {
      thread.title = trimmed || "New attachment thread";
      thread.projectLabel = basename(this.options.cwd) || "workspace";
    }

    thread.runtimeTarget = this.#runtimeTarget;
    thread.state = "running";
    thread.updatedAt = "Now";
    upsertThread(nextSnapshot, thread);
    this.options.workspaceStore.replaceSnapshot(nextSnapshot);
    return nextSnapshot;
  }

  async interruptThread(threadId: string) {
    await this.#ensureClient();
    const activeTurnId =
      this.#activeTurnIdByThread.get(threadId) ??
      findActiveTurnId(await this.client.readThread(threadId));

    if (!activeTurnId) {
      return this.options.workspaceStore.getSnapshot();
    }

    await this.client.interruptTurn(threadId, activeTurnId);
    this.#activeTurnIdByThread.delete(threadId);
    return this.options.workspaceStore.getSnapshot();
  }

  async resolveApproval(id: string, input: { approve: boolean; answers?: Record<string, string> }) {
    await this.#ensureClient();
    const request = this.#pendingServerRequests.get(id);
    if (!request) {
      throw new Error("Approval request not found.");
    }

    if (request.method === "item/tool/requestUserInput") {
      this.client.respondToServerRequest(request.id, { answers: input.answers ?? {} });
    } else if (request.method === "mcpServer/elicitation/request") {
      this.client.respondToServerRequest(request.id, {
        action: input.approve ? "accept" : "decline",
        content: input.approve ? (input.answers ?? {}) : undefined,
      });
    } else if (
      request.method === "item/commandExecution/requestApproval" ||
      request.method === "execCommandApproval" ||
      request.method === "item/fileChange/requestApproval" ||
      request.method === "applyPatchApproval" ||
      request.method === "item/permissions/requestApproval"
    ) {
      this.client.respondToServerRequest(request.id, {
        decision:
          request.method === "execCommandApproval" || request.method === "applyPatchApproval"
            ? input.approve ? "approved" : "denied"
            : input.approve ? "accept" : "decline",
      });
    } else {
      this.client.rejectServerRequest(request.id, `Unsupported server request: ${request.method}`);
    }

    this.#pendingServerRequests.delete(id);
    this.options.workspaceStore.resolveApproval(id, input.approve ? "approved" : "declined");
    this.options.workspaceStore.clearResolvedApprovals();
    return this.options.workspaceStore.getSnapshot();
  }

  async readWorkbenchInventory(): Promise<OffdexWorkbenchInventory> {
    await this.#ensureClient();
    const snapshot = this.options.workspaceStore.getSnapshot();
    const selectedThreadId = snapshot.threads.find((thread) => thread.id !== NEW_THREAD_ID)?.id ?? null;
    const [apps, models, config, plugins, skills, mcpServers, rateLimits, experimentalFeatures] = await Promise.all([
      this.client.listApps(selectedThreadId ?? undefined).catch(() => []),
      this.client.listModels().catch(() => []),
      this.client.readConfig(this.options.cwd).catch(() => null),
      this.client.listPlugins(this.options.cwd).catch(() => []),
      this.client.listSkills(this.options.cwd).catch(() => []),
      this.client.listMcpServers().catch(() => []),
      this.client.readRateLimits().catch(() => null),
      this.client.listExperimentalFeatures().catch(() => []),
    ]);

    return {
      codeHome: process.env.CODEX_HOME?.trim() || "",
      plugins: plugins.flatMap((marketplace) =>
        marketplace.plugins.map<OffdexPluginRecord>((plugin) => ({
          id: plugin.id,
          name: plugin.interface?.displayName ?? plugin.name,
          pluginName: plugin.name,
          marketplacePath: marketplace.path,
          path: plugin.source?.path ?? marketplace.path,
          source: plugin.source?.type === "local" ? "local" : "cache",
          enabled: plugin.enabled,
          installed: plugin.installed,
          installPolicy: plugin.installPolicy,
          authPolicy: plugin.authPolicy,
          category: plugin.interface?.category ?? null,
          description:
            plugin.interface?.shortDescription ??
            plugin.interface?.longDescription ??
            null,
          developer: plugin.interface?.developerName ?? null,
          websiteUrl: plugin.interface?.websiteUrl ?? null,
          capabilities: plugin.interface?.capabilities ?? [],
        }))
      ),
      skills: skills.flatMap((entry) =>
        entry.skills.map<OffdexSkillRecord>((skill) => ({
          id: `${skill.scope}:${skill.name}`,
          name: skill.name,
          path: skill.path,
          source: skill.path.includes("/plugins/") ? "plugin" : skill.path.includes("/.agents/") ? "agents" : "codex",
          enabled: skill.enabled,
          scope: skill.scope,
          description: skill.description,
          shortDescription: skill.shortDescription ?? null,
          cwd: entry.cwd,
        }))
      ),
      mcpServers: mcpServers.map<OffdexMcpServerRecord>((server) => ({
        name: server.name,
        authStatus: server.authStatus ?? "unsupported",
        toolCount: Object.keys(server.tools ?? {}).length,
        resourceCount: Array.isArray(server.resources) ? server.resources.length : 0,
        resourceTemplateCount: Array.isArray(server.resourceTemplates)
          ? server.resourceTemplates.length
          : 0,
      })),
      automations: [],
      apps: apps.map<OffdexAppRecord>((app) => ({
        id: app.id,
        name: app.name,
        description: app.description ?? null,
        developer: app.branding?.developer ?? null,
        category: app.branding?.category ?? null,
        distributionChannel: app.distributionChannel ?? null,
        installUrl: app.installUrl ?? null,
        websiteUrl: app.branding?.website ?? null,
        isAccessible: app.isAccessible === true,
        isEnabled: app.isEnabled !== false,
        logoUrl: app.logoUrl ?? null,
        logoUrlDark: app.logoUrlDark ?? null,
        labels: app.labels ?? {},
      })),
      models: models.map<OffdexModelRecord>((model) => ({
        id: model.id,
        model: model.model,
        displayName: model.displayName,
        description: model.description,
        defaultReasoningEffort: model.defaultReasoningEffort,
        reasoningEfforts: model.supportedReasoningEfforts.map((entry) =>
          typeof entry === "string" ? entry : entry.reasoningEffort ?? "medium"
        ),
        inputModalities: model.inputModalities ?? ["text", "image"],
        isDefault: model.isDefault,
        hidden: model.hidden,
      })),
      config: config
        ? ({
            model: config.model ?? null,
            modelProvider: config.model_provider ?? null,
            reasoningEffort: config.model_reasoning_effort ?? null,
            sandboxMode: config.sandbox_mode ?? null,
            approvalPolicy: config.approval_policy ?? null,
            webSearch: config.web_search ?? null,
          } satisfies OffdexConfigSummary)
        : null,
      rateLimits,
      experimentalFeatures: experimentalFeatures.map<OffdexExperimentalFeatureRecord>((feature) => ({
        name: feature.name,
        stage: feature.stage ?? null,
        displayName: feature.displayName ?? null,
        description: feature.description ?? null,
        announcement: feature.announcement ?? null,
        enabled: feature.enabled === true,
        defaultEnabled: feature.defaultEnabled === true,
      })),
    };
  }

  async writeConfigValue(keyPath: string, value: unknown, filePath?: string | null) {
    await this.#ensureClient();
    await this.client.writeConfigValue(keyPath, value, filePath);
    return this.readWorkbenchInventory();
  }

  async setSkillEnabled(input: { name?: string | null; path?: string | null; enabled: boolean }) {
    await this.#ensureClient();
    await this.client.writeSkillConfig(input);
    return this.readWorkbenchInventory();
  }

  async installPlugin(input: { marketplacePath: string; pluginName: string }) {
    await this.#ensureClient();
    await this.client.installPlugin(input.marketplacePath, input.pluginName);
    return this.readWorkbenchInventory();
  }

  async uninstallPlugin(pluginId: string) {
    await this.#ensureClient();
    await this.client.uninstallPlugin(pluginId);
    return this.readWorkbenchInventory();
  }

  async readRemoteDirectory(path: string): Promise<OffdexRemoteFileEntry[]> {
    await this.#ensureClient();
    const entries = await this.client.readDirectory(path);
    return entries.map((entry) => ({
      name: entry.fileName,
      path: `${path.replace(/\/+$/, "")}/${entry.fileName}`.replace(/^\/\//, "/"),
      isDirectory: entry.isDirectory,
      isFile: entry.isFile,
    }));
  }

  async searchRemoteFiles(query: string, roots: string[]): Promise<OffdexRemoteFileMatch[]> {
    await this.#ensureClient();
    const matches = await this.client.searchFiles(query, roots);
    return matches.map((match) => ({
      name: match.file_name,
      path: match.path,
      root: match.root,
      kind: match.match_type,
      score: match.score,
    }));
  }

  async renameThread(threadId: string, name: string) {
    await this.#ensureClient();
    await this.client.setThreadName(threadId, name);
    return this.refreshSnapshot();
  }

  async forkThread(threadId: string) {
    await this.#ensureClient();
    await this.client.forkThread(threadId);
    return this.refreshSnapshot();
  }

  async archiveThread(threadId: string) {
    await this.#ensureClient();
    await this.client.archiveThread(threadId);
    return this.refreshSnapshot();
  }

  async unarchiveThread(threadId: string) {
    await this.#ensureClient();
    await this.client.unarchiveThread(threadId);
    return this.refreshSnapshot();
  }

  async compactThread(threadId: string) {
    await this.#ensureClient();
    try {
      await this.client.compactThread(threadId);
    } catch (error) {
      if (!isMissingThreadError(error)) {
        throw error;
      }
      await this.client.resumeThread(threadId);
      await this.client.compactThread(threadId);
    }
    return this.refreshSnapshot();
  }

  async startReview(threadId: string) {
    await this.#ensureClient();
    let response;
    try {
      response = await this.client.startReview(threadId);
    } catch (error) {
      if (!isMissingThreadError(error)) {
        throw error;
      }
      await this.client.resumeThread(threadId);
      response = await this.client.startReview(threadId);
    }
    this.#activeTurnIdByThread.set(response.reviewThreadId, response.turn.id);
    return this.refreshSnapshot();
  }

  async startMcpOauthLogin(name: string) {
    await this.#ensureClient();
    return this.client.startMcpOauthLogin(name);
  }

  async close() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#unsubscribeServerRequests?.();
    this.#unsubscribeServerRequests = null;
    await this.client.close();
  }

  async #ensureClient() {
    await this.client.ensureConnected();

    if (this.#unsubscribe) {
      return;
    }

    this.#unsubscribeServerRequests = this.client.subscribeToServerRequests((request) => {
      this.#pendingServerRequests.set(String(request.id), request);
      this.options.workspaceStore.upsertApproval(serverRequestToApproval(request));
    });

    this.#unsubscribe = this.client.subscribe((notification) => {
      if (notification.method === "turn/started") {
        const payload = (notification as TurnStartedNotification).params;
        this.#activeTurnIdByThread.set(payload.threadId, payload.turn.id);
      }

      if (notification.method === "turn/completed") {
        const payload = (notification as TurnCompletedNotification).params;
        this.#activeTurnIdByThread.delete(payload.threadId);
      }

      if (notification.method === "error") {
        const payload = (notification as ErrorNotification).params;
        if (!payload.willRetry) {
          this.#activeTurnIdByThread.delete(payload.threadId);
        }
      }

      const nextSnapshot = applyCodexNotification(
        this.options.workspaceStore.getSnapshot(),
        notification,
        this.#runtimeTarget
      );
      this.options.workspaceStore.replaceSnapshot(nextSnapshot);
    });
  }
}
