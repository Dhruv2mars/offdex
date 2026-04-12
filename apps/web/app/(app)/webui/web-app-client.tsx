"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent, type ClipboardEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  OFFDEX_NEW_THREAD_ID,
  claimPairing,
  extractPairingUri,
  fetchBridgeFiles,
  fetchBridgeHealth,
  fetchBridgeInventory,
  fetchBridgeSnapshot,
  liveUrlForConnection,
  normalizeBridgeUrl,
  searchBridgeFiles,
  sendBridgeConfigWrite,
  sendBridgeMcpOauthLogin,
  sendBridgePluginInstall,
  sendBridgePluginUninstall,
  sendBridgeSkillConfigWrite,
  sendBridgeReview,
  sendBridgeThreadArchive,
  sendBridgeThreadCompact,
  sendBridgeThreadFork,
  sendBridgeThreadRename,
  sendBridgeThreadUnarchive,
  type OffdexInputItem,
  type OffdexRemoteFileEntry,
  type OffdexRemoteFileMatch,
  type OffdexWorkbenchInventory,
  parseManagedSession,
  readLiveSnapshotMessage,
  resolveManagedConnection,
  sendBridgeApproval,
  sendBridgeInterrupt,
  sendBridgeRuntime,
  sendBridgeTurn,
  serializeManagedSession,
  type BridgeHealth,
  type ConnectionTransport,
  type ManagedSession,
  type OffdexApprovalRequest,
  type OffdexAutomationRecord,
  type OffdexPermissionReview,
  type OffdexThread,
  type OffdexTimelineItem,
  type OffdexTurn,
  type OffdexWorkspaceSnapshot,
} from "./web-transport";

type ConnectionState = "idle" | "connecting" | "live" | "offline";
type WorkbenchPanel = "search" | "history" | "plugins" | "apps" | "automations" | "settings" | "files" | "diff" | null;
type ComposerAttachment = {
  id: string;
  name: string;
  kind: "text" | "image" | "workspace";
  preview: string;
  input: OffdexInputItem;
};

export type ParsedDiffFile = {
  id: string;
  path: string;
  previousPath: string | null;
  additions: number;
  deletions: number;
  hunks: string[];
  raw: string;
};

const STORED_BRIDGE_KEY = "offdex:web:bridge";
const STORED_SESSION_KEY = "offdex:web:machine-session";
const APPROVAL_POLICY_OPTIONS = ["never", "on-request"] as const;
const SANDBOX_MODE_OPTIONS = ["read-only", "workspace-write", "danger-full-access"] as const;
const WEB_SEARCH_OPTIONS = ["live", "off"] as const;

type IconName =
  | "collapse"
  | "message"
  | "folder"
  | "settings"
  | "plug"
  | "plus"
  | "search"
  | "plugins"
  | "automations"
  | "edit"
  | "cloud"
  | "more"
  | "commit"
  | "split"
  | "mic"
  | "arrow-up"
  | "chevron-down"
  | "stop"
  | "warning"
  | "archive";

function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "collapse":
      return <svg aria-hidden="true" {...common}><rect height="16" rx="3" width="16" x="4" y="4" /><path d="M10 4v16" /></svg>;
    case "message":
      return <svg aria-hidden="true" {...common}><path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v5a3.5 3.5 0 0 1-3.5 3.5H11l-4.5 4v-4A3.5 3.5 0 0 1 5 11.5z" /></svg>;
    case "folder":
      return <svg aria-hidden="true" {...common}><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6A2.5 2.5 0 0 1 20.5 9.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5z" /></svg>;
    case "settings":
      return <svg aria-hidden="true" {...common}><circle cx="12" cy="12" r="3" /><path d="M12 2.8v3M12 18.2v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.8 12h3M18.2 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></svg>;
    case "plug":
      return <svg aria-hidden="true" {...common}><path d="M9 7V3M15 7V3M7 7h10v4a5 5 0 0 1-10 0zM12 16v5" /></svg>;
    case "plus":
      return <svg aria-hidden="true" {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "search":
      return <svg aria-hidden="true" {...common}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>;
    case "plugins":
      return <svg aria-hidden="true" {...common}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" /></svg>;
    case "automations":
      return <svg aria-hidden="true" {...common}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;
    case "edit":
      return <svg aria-hidden="true" {...common}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>;
    case "cloud":
      return <svg aria-hidden="true" {...common} strokeWidth="1.5"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /><path d="M10 12.5l-1 1 1 1M14 12.5l1 1-1 1M11 15h2" strokeLinecap="square" /></svg>;
    case "more":
      return <svg aria-hidden="true" {...common}><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /><circle cx="5" cy="12" r="1.5" /></svg>;
    case "commit":
      return <svg aria-hidden="true" {...common}><circle cx="12" cy="12" r="3" /><path d="M3 12h6M15 12h6" /></svg>;
    case "split":
      return <svg aria-hidden="true" {...common}><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 3v18" /></svg>;
    case "mic":
      return <svg aria-hidden="true" {...common}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" /></svg>;
    case "arrow-up":
      return <svg aria-hidden="true" {...common}><path d="M12 19V5M5 12l7-7 7 7" /></svg>;
    case "chevron-down":
      return <svg aria-hidden="true" {...common}><path d="m6 9 6 6 6-6" /></svg>;
    case "stop":
      return <svg aria-hidden="true" {...common}><rect x="6" y="6" width="12" height="12" rx="2" /></svg>;
    case "warning":
      return <svg aria-hidden="true" {...common}><path d="m12 4 8 14H4L12 4Z" /><path d="M12 9v4M12 16h.01" /></svg>;
    case "archive":
      return <svg aria-hidden="true" {...common}><path d="M4 7h16" /><path d="M6 7v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" /><path d="M9 11h6" /><path d="M10 4h4" /></svg>;
  }
}

function roleLabel(item: OffdexTimelineItem) {
  if (item.type === "userMessage") return "You";
  if (item.type === "agentMessage") return item.phase === "final_answer" ? "Codex" : "Codex live";
  if (item.type === "plan") return "Plan";
  if (item.type === "reasoning") return "Reasoning";
  if (item.type === "taskLifecycle") return "Task";
  if (item.type === "toolActivity") return "Tool";
  if (item.type === "tokenUsage") return "Usage";
  if (item.type === "commandExecution") return "Command";
  return item.label;
}

function flattenTurns(turns: OffdexTurn[]) {
  return (turns ?? []).flatMap((turn) => turn.items.map((item) => ({ item, turn })));
}

function fallbackTimeline(thread: OffdexThread) {
  return thread.messages.map((message, index) => ({
    item:
      message.role === "user"
        ? ({
            type: "userMessage",
            id: message.id,
            content: [{ type: "text", text: message.body }],
          } satisfies OffdexTimelineItem)
        : ({
            type: "agentMessage",
            id: message.id,
            text: message.body,
            phase: "final_answer",
          } satisfies OffdexTimelineItem),
    turn: {
      id: `${thread.id}-message-${index}`,
      status: thread.state === "running" ? "inProgress" : "completed",
      errorMessage: null,
      items: [],
    } satisfies OffdexTurn,
  }));
}

function itemsForThread(thread: OffdexThread | null) {
  if (!thread) return [];
  if ((thread.turns ?? []).length > 0) {
    return flattenTurns(thread.turns);
  }
  if ((thread.messages ?? []).length > 0) {
    return fallbackTimeline(thread);
  }
  return [];
}

function itemBody(item: OffdexTimelineItem) {
  if (item.type === "userMessage") {
    return item.content
      .map((entry) => {
        switch (entry.type) {
          case "text":
            return entry.text;
          case "image":
            return `[Image] ${entry.url}`;
          case "localImage":
            return `[Local image] ${entry.path}`;
          case "mention":
            return `@${entry.name} ${entry.path}`;
          case "skill":
            return `$${entry.name} ${entry.path}`;
        }
      })
      .join("\n");
  }
  if (item.type === "agentMessage") return item.text;
  if (item.type === "plan") return item.text;
  if (item.type === "reasoning") return [...item.summary, ...item.content].join("\n");
  if (item.type === "taskLifecycle") return [item.label, item.detail].filter(Boolean).join("\n");
  if (item.type === "toolActivity") return [item.summary, item.input, item.output].filter(Boolean).join("\n");
  if (item.type === "tokenUsage") return item.summary;
  if (item.type === "commandExecution") return item.aggregatedOutput || item.command;
  return item.data;
}

function panelTitle(panel: Exclude<WorkbenchPanel, null>) {
  if (panel === "search") return "Search";
  if (panel === "history") return "Archived threads";
  if (panel === "plugins") return "Plugins and skills";
  if (panel === "apps") return "Apps and connectors";
  if (panel === "automations") return "Automations";
  if (panel === "files") return "Workspace files";
  if (panel === "diff") return "Turn diff";
  return "Settings";
}

function latestTurnWithDiff(thread: OffdexThread | null) {
  return [...(thread?.turns ?? [])].reverse().find((turn) => Boolean(turn.diff?.trim())) ?? null;
}

export function parseUnifiedDiff(diff: string): ParsedDiffFile[] {
  const lines = diff.split("\n");
  const files: ParsedDiffFile[] = [];
  let current: ParsedDiffFile | null = null;
  let currentLines: string[] = [];

  function pushCurrent() {
    if (!current) {
      return;
    }

    current.raw = currentLines.join("\n").trim();
    files.push(current);
    current = null;
    currentLines = [];
  }

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      pushCurrent();
      const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
      const previousPath = match?.[1] ?? null;
      const path = match?.[2] ?? previousPath ?? "unknown file";
      current = {
        id: `${path}-${files.length}`,
        path,
        previousPath: previousPath && previousPath !== path ? previousPath : null,
        additions: 0,
        deletions: 0,
        hunks: [],
        raw: "",
      };
    }

    if (!current) {
      continue;
    }

    currentLines.push(line);

    if (line.startsWith("@@")) {
      current.hunks.push(line);
      continue;
    }

    if (line.startsWith("rename from ")) {
      current.previousPath = line.slice("rename from ".length).trim() || current.previousPath;
      continue;
    }

    if (line.startsWith("rename to ")) {
      current.path = line.slice("rename to ".length).trim() || current.path;
      continue;
    }

    if (line.startsWith("+++ ")) {
      const nextPath = line.slice(4).replace(/^b\//, "").trim();
      if (nextPath && nextPath !== "/dev/null") {
        current.path = nextPath;
      }
      continue;
    }

    if (line.startsWith("--- ")) {
      const previousPath = line.slice(4).replace(/^a\//, "").trim();
      if (previousPath && previousPath !== "/dev/null" && previousPath !== current.path) {
        current.previousPath = previousPath;
      }
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      current.additions += 1;
      continue;
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      current.deletions += 1;
    }
  }

  pushCurrent();
  return files;
}

function parentDirectory(path: string) {
  const trimmed = path.replace(/\/+$/, "");
  const next = trimmed.slice(0, Math.max(1, trimmed.lastIndexOf("/")));
  return next || "/";
}

function formatRateLimitReset(value: string | null | undefined) {
  if (!value) {
    return "unknown reset";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  const deltaMs = parsed - Date.now();
  if (deltaMs <= 0) {
    return "resetting now";
  }

  const deltaMins = Math.round(deltaMs / 60_000);
  if (deltaMins < 60) {
    return `resets in ${deltaMins}m`;
  }

  const deltaHours = Math.round(deltaMins / 60);
  return `resets in ${deltaHours}h`;
}

function toSearchEntries(threads: OffdexThread[]) {
  return threads.flatMap((thread) => {
    const threadEntry = {
      id: `${thread.id}:title`,
      threadId: thread.id,
      title: thread.title,
      snippet: [thread.projectLabel, thread.cwd, thread.gitInfo?.branch].filter(Boolean).join(" · "),
    };
    const timelineEntries = itemsForThread(thread).map(({ item, turn }) => ({
      id: `${thread.id}:${turn.id}:${item.id}`,
      threadId: thread.id,
      title: `${thread.title} · ${roleLabel(item)}`,
      snippet: itemBody(item),
    }));
    return [threadEntry, ...timelineEntries];
  });
}

function formatDuration(durationMs: number | null | undefined) {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs)) {
    return null;
  }
  if (durationMs < 1_000) {
    return `${durationMs}ms`;
  }
  if (durationMs < 60_000) {
    return `${(durationMs / 1_000).toFixed(1)}s`;
  }
  return `${Math.round(durationMs / 60_000)}m`;
}

function toneForStatus(status: string | null | undefined) {
  if (status === "failed" || status === "declined" || status === "interrupted") {
    return "bg-[#fff1f0] text-[#b42318]";
  }
  if (status === "completed" || status === "approved") {
    return "bg-[#ecfdf3] text-[#027a48]";
  }
  if (status === "running" || status === "in_progress" || status === "inProgress" || status === "pending") {
    return "bg-[#eff8ff] text-[#175cd3]";
  }
  return "bg-muted text-muted-foreground";
}

function iconForToolSource(source: "tool" | "search" | "file" | "mcp" | "unknown") {
  if (source === "search") return "search";
  if (source === "file") return "folder";
  if (source === "mcp") return "plug";
  return "commit";
}

function threadMatchesFilter(thread: OffdexThread, query: string) {
  if (!query.trim()) {
    return true;
  }
  const haystack = [
    thread.title,
    thread.projectLabel,
    thread.cwd,
    thread.path,
    thread.gitInfo?.branch,
    thread.gitInfo?.originUrl,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function ThreadSummaryCard({
  thread,
  runtimeTarget,
  accountEmail,
}: {
  thread: OffdexThread | null;
  runtimeTarget: OffdexWorkspaceSnapshot["pairing"]["runtimeTarget"] | null | undefined;
  accountEmail: string | null | undefined;
}) {
  if (!thread) {
    return (
      <article className="rounded-2xl bg-background p-4 shadow-card">
        <h3 className="text-sm font-semibold text-foreground">Workbench</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a thread to inspect workspace, git, and runtime context.
        </p>
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">{accountEmail ?? "No active account"}</p>
      </article>
    );
  }

  return (
    <article className="rounded-2xl bg-background p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">{thread.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{thread.projectLabel}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] shadow-border ${toneForStatus(thread.state)}`}>
          {thread.state}
        </span>
      </div>
      <dl className="mt-4 grid gap-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-3">
          <dt>Workspace</dt>
          <dd className="truncate font-mono text-[11px] text-foreground">{thread.cwd ?? "Unavailable"}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>Branch</dt>
          <dd className="truncate font-mono text-[11px] text-foreground">{thread.gitInfo?.branch ?? "main"}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>Runtime</dt>
          <dd className="text-foreground">{runtimeTarget ?? thread.runtimeTarget}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>Source</dt>
          <dd className="text-foreground">{thread.source ?? "bridge"}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>Turns</dt>
          <dd className="text-foreground">{thread.turns.length}</dd>
        </div>
      </dl>
    </article>
  );
}

function AutomationCard({ automation }: { automation: OffdexAutomationRecord }) {
  return (
    <article className="rounded-2xl bg-muted p-4 shadow-border">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{automation.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {[automation.kind, automation.status].filter(Boolean).join(" · ") || "Unknown automation"}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] shadow-border ${toneForStatus(automation.status)}`}>
          {automation.status ?? "unknown"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-foreground">
        {automation.schedule ? automation.schedule : "No schedule metadata was returned for this automation."}
      </p>
      <p className="mt-2 font-mono text-[11px] text-muted-foreground">{automation.path}</p>
    </article>
  );
}

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function ApprovalCard({
  approval,
  onApprove,
  onDecline,
  value,
  onValueChange,
  disabled,
}: {
  approval: OffdexApprovalRequest;
  onApprove: () => void;
  onDecline: () => void;
  value: string;
  onValueChange: (value: string) => void;
  disabled: boolean;
}) {
  const isAnswerInput = approval.inputSchema === "answers";
  const approveLabel = approval.method === "mcpServer/elicitation/request" ? "Submit" : "Allow";
  const declineLabel = approval.method === "mcpServer/elicitation/request" ? "Cancel" : "Deny";

  return (
    <article className="rounded-2xl bg-background p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-[#fff1f0] p-2 text-destructive">
          <Icon name="warning" className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{approval.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{approval.method}</p>
          <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-muted px-3 py-2 font-mono text-[11px] leading-5 text-muted-foreground whitespace-pre-wrap">
            {approval.detail}
          </pre>
          {isAnswerInput ? (
            <textarea
              className="focus-ring mt-3 min-h-24 w-full rounded-xl bg-background px-3 py-2 font-mono text-xs text-foreground shadow-border"
              onChange={(event) => onValueChange(event.target.value)}
              placeholder={approval.method === "mcpServer/elicitation/request" ? '{"field":"value"}' : '{"answer":"..."}'}
              value={value}
            />
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              className="focus-ring rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-40"
              disabled={disabled}
              onClick={onApprove}
              type="button"
            >
              {approveLabel}
            </button>
            <button
              className="focus-ring rounded-full bg-muted px-4 py-2 text-xs font-medium text-foreground shadow-border disabled:opacity-40"
              disabled={disabled}
              onClick={onDecline}
              type="button"
            >
              {declineLabel}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function PermissionReviewCard({ review }: { review: OffdexPermissionReview }) {
  const outcomeLabel =
    review.status === "running"
      ? "Reviewing"
      : review.outcome === "approved"
        ? "Auto-approved"
        : review.outcome === "declined"
          ? "Needs permission"
          : "Reviewed";

  return (
    <article className="rounded-2xl bg-background p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-muted p-2 text-foreground">
          <Icon name="warning" className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">{review.title}</h3>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground shadow-border">
              {outcomeLabel}
            </span>
          </div>
          <pre className="mt-3 max-h-40 overflow-auto rounded-xl bg-muted px-3 py-2 font-mono text-[11px] leading-5 text-muted-foreground whitespace-pre-wrap">
            {review.detail}
          </pre>
        </div>
      </div>
    </article>
  );
}

function TimelineRow({ item, turn }: { item: OffdexTimelineItem; turn: OffdexTurn }) {
  if (item.type === "taskLifecycle") {
    return (
      <article className="rounded-2xl bg-background p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-muted p-2 text-muted-foreground shadow-border">
              <Icon name={item.status === "failed" ? "warning" : "commit"} className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Task</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{item.label}</p>
              {item.detail ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p> : null}
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 font-mono text-[11px] shadow-border ${toneForStatus(item.status)}`}>
            {item.status}
          </span>
        </div>
      </article>
    );
  }

  if (item.type === "toolActivity") {
    return (
      <article className="rounded-2xl bg-background p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-2xl bg-muted p-2 text-muted-foreground shadow-border">
              <Icon name={iconForToolSource(item.source)} className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {item.source === "search" ? "Search" : item.source === "file" ? "File activity" : item.source === "mcp" ? "MCP tool" : "Tool activity"}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{item.toolName}</p>
              {item.summary ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p> : null}
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 font-mono text-[11px] shadow-border ${toneForStatus(item.status)}`}>
            {item.status}
          </span>
        </div>
        {item.input ? (
          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Input</p>
            <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-muted px-3 py-3 font-mono text-[11px] leading-5 text-foreground whitespace-pre-wrap">
              {item.input}
            </pre>
          </div>
        ) : null}
        {item.output ? (
          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Output</p>
            <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-muted px-3 py-3 font-mono text-[11px] leading-5 text-foreground whitespace-pre-wrap">
              {item.output}
            </pre>
          </div>
        ) : null}
      </article>
    );
  }

  if (item.type === "tokenUsage") {
    return (
      <article className="rounded-2xl bg-muted p-4 shadow-border">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Usage</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{item.summary}</p>
          </div>
          <span className={`rounded-full px-3 py-1 font-mono text-[11px] shadow-border ${toneForStatus("completed")}`}>
            update
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {typeof item.totalTokens === "number" ? (
            <span className="rounded-full bg-background px-3 py-1 font-mono text-[11px] text-muted-foreground shadow-border">
              total {item.totalTokens.toLocaleString()}
            </span>
          ) : null}
          {typeof item.primaryPercent === "number" ? (
            <span className="rounded-full bg-background px-3 py-1 font-mono text-[11px] text-muted-foreground shadow-border">
              primary {item.primaryPercent}%
            </span>
          ) : null}
          {typeof item.secondaryPercent === "number" ? (
            <span className="rounded-full bg-background px-3 py-1 font-mono text-[11px] text-muted-foreground shadow-border">
              weekly {item.secondaryPercent}%
            </span>
          ) : null}
          {item.planType ? (
            <span className="rounded-full bg-background px-3 py-1 font-mono text-[11px] text-muted-foreground shadow-border">
              {item.planType}
            </span>
          ) : null}
        </div>
      </article>
    );
  }

  if (item.type === "commandExecution") {
    return (
      <article className="rounded-2xl bg-background p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Command</p>
            <p className="mt-1 font-mono text-xs text-foreground">{item.command}</p>
            {item.cwd ? <p className="mt-1 font-mono text-[11px] text-muted-foreground">{item.cwd}</p> : null}
          </div>
          <div className={`rounded-full px-3 py-1 font-mono text-[11px] shadow-border ${toneForStatus(item.status)}`}>
            {item.status}
          </div>
        </div>
        {item.actions?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.actions.map((action, index) => (
              <span
                className="rounded-full bg-muted px-3 py-1 font-mono text-[11px] text-muted-foreground shadow-border"
                key={`${action.type}-${action.command ?? action.path ?? index}`}
              >
                {action.type}
                {action.command ? ` · ${action.command}` : action.path ? ` · ${action.path}` : ""}
              </span>
            ))}
          </div>
        ) : null}
        {item.aggregatedOutput ? (
          <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-muted px-3 py-3 font-mono text-[12px] leading-5 text-foreground whitespace-pre-wrap">
            {item.aggregatedOutput}
          </pre>
        ) : null}
        <p className="mt-3 text-[11px] text-muted-foreground">
          {turn.status}
          {typeof item.exitCode === "number" ? ` · exit ${item.exitCode}` : ""}
          {formatDuration(item.durationMs) ? ` · ${formatDuration(item.durationMs)}` : ""}
          {item.source ? ` · ${item.source}` : ""}
        </p>
      </article>
    );
  }

  const isUser = item.type === "userMessage";
  const isPlan = item.type === "plan";
  const isUnknown = item.type === "unknown";
  const body = itemBody(item);

  if (item.type === "reasoning") {
    return (
      <article className="rounded-2xl bg-muted p-4 shadow-border">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Reasoning</p>
          <span className={`rounded-full px-2.5 py-1 text-[11px] shadow-border ${toneForStatus(turn.status)}`}>
            {turn.status}
          </span>
        </div>
        {item.summary.length > 0 ? (
          <div className="mt-3 space-y-2">
            {item.summary.map((entry, index) => (
              <p className="text-sm leading-6 text-foreground" key={`${item.id}-summary-${index}`}>
                {entry}
              </p>
            ))}
          </div>
        ) : null}
        {item.content.length > 0 ? (
          <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-background px-3 py-3 font-mono text-[11px] leading-5 text-muted-foreground shadow-border whitespace-pre-wrap">
            {item.content.join("\n")}
          </pre>
        ) : null}
      </article>
    );
  }

  if (item.type === "unknown") {
    return (
      <article className="rounded-2xl bg-background p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Raw runtime event</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[11px] shadow-border ${toneForStatus(turn.status)}`}>
            {turn.status}
          </span>
        </div>
        <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-muted px-3 py-3 font-mono text-[11px] leading-5 text-foreground whitespace-pre-wrap">
          {item.data}
        </pre>
      </article>
    );
  }

  return (
    <article className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-[18px] px-4 py-3 ${
          isUser
            ? "bg-foreground text-background"
            : isPlan
              ? "bg-accent text-accent-foreground shadow-border"
              : "bg-background text-foreground shadow-card"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-60">{roleLabel(item)}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] shadow-border ${toneForStatus(turn.status)}`}>
            {turn.status}
          </span>
        </div>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-[14px] leading-7">{body}</pre>
        {turn.errorMessage ? (
          <p className="mt-3 rounded-xl bg-[#fff1f0] px-3 py-2 text-[11px] leading-5 text-[#b42318]">
            {turn.errorMessage}
          </p>
        ) : null}
        {isPlan ? (
          <p className="mt-3 text-[11px] opacity-60">Plan updates stream in-line for the active turn.</p>
        ) : null}
        {isUnknown ? <p className="mt-3 text-[11px] opacity-60">Runtime event</p> : null}
      </div>
    </article>
  );
}

export function WebAppClient() {
  const searchParams = useSearchParams();
  const [bridgeUrl, setBridgeUrl] = useState("");
  const [connectionTarget, setConnectionTarget] = useState("");
  const [connectionTransport, setConnectionTransport] = useState<ConnectionTransport | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [snapshot, setSnapshot] = useState<OffdexWorkspaceSnapshot | null>(null);
  const [inventory, setInventory] = useState<OffdexWorkbenchInventory | null>(null);
  const [health, setHealth] = useState<BridgeHealth | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState(OFFDEX_NEW_THREAD_ID);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<WorkbenchPanel>(null);
  const [threadFilter, setThreadFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [archivedQuery, setArchivedQuery] = useState("");
  const [approvalAnswers, setApprovalAnswers] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [remoteDirectoryPath, setRemoteDirectoryPath] = useState("");
  const [remoteEntries, setRemoteEntries] = useState<OffdexRemoteFileEntry[]>([]);
  const [remoteFileQuery, setRemoteFileQuery] = useState("");
  const [remoteFileMatches, setRemoteFileMatches] = useState<OffdexRemoteFileMatch[]>([]);
  const [remoteFilesLoading, setRemoteFilesLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const socketRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const threads = snapshot?.threads ?? [];
  const isDraftThread = selectedThreadId === OFFDEX_NEW_THREAD_ID;
  const selectedThread =
    isDraftThread
      ? null
      : threads.find((thread) => thread.id === selectedThreadId) ??
        threads[0] ??
        null;
  const flattenedItems = itemsForThread(selectedThread);
  const pendingApprovals = (snapshot?.pendingApprovals ?? []).filter((approval) => approval.status === "pending");
  const permissionReviews = (snapshot?.permissionReviews ?? [])
    .filter((review) => !selectedThread || !review.threadId || review.threadId === selectedThread.id)
    .slice(0, 4);
  const activePermissionReviews = permissionReviews.filter((review) => review.status === "running");
  const isLive = connectionState === "live";
  const codexReady = health?.bridgeMode === "demo" || Boolean(snapshot?.account?.isAuthenticated || health?.codexConnected);
  const canSend = (draft.trim().length > 0 || attachments.length > 0) && isLive && codexReady && !isPending;
  const workspaceRoot = selectedThread?.cwd ?? threads[0]?.cwd ?? "";
  const activeDiffTurn = latestTurnWithDiff(selectedThread);
  const parsedDiffFiles = activeDiffTurn?.diff ? parseUnifiedDiff(activeDiffTurn.diff) : [];
  const diffTotals = parsedDiffFiles.reduce(
    (totals, file) => ({
      additions: totals.additions + file.additions,
      deletions: totals.deletions + file.deletions,
    }),
    { additions: 0, deletions: 0 }
  );
  const visibleModels = (inventory?.models ?? []).filter((model) => !model.hidden);
  const activeModel =
    visibleModels.find((model) => model.model === inventory?.config?.model) ??
    visibleModels.find((model) => model.isDefault) ??
    null;
  const reasoningOptions = activeModel?.reasoningEfforts ?? [];
  const searchResults =
    searchQuery.trim().length === 0
      ? []
      : toSearchEntries(threads)
          .filter((entry) =>
            `${entry.title}\n${entry.snippet}`.toLowerCase().includes(searchQuery.trim().toLowerCase())
          )
          .slice(0, 40);
  const archivedThreads = snapshot?.archivedThreads ?? [];
  const archivedResults = archivedThreads.filter((thread) =>
    archivedQuery.trim()
      ? `${thread.title}\n${thread.projectLabel}\n${thread.messages[0]?.body ?? ""}`.toLowerCase().includes(archivedQuery.trim().toLowerCase())
      : true
  );

  useEffect(() => {
    if (!isDraftThread && !selectedThread && threads.length > 0) {
      setSelectedThreadId(threads[0]!.id);
    }
  }, [isDraftThread, selectedThread, threads]);

  useEffect(() => {
    if (panel !== "files" || !workspaceRoot || !isLive) {
      return;
    }

    const nextPath = remoteDirectoryPath || workspaceRoot;
    setRemoteFilesLoading(true);
    void fetchBridgeFiles(connectionTarget || bridgeUrl, nextPath)
      .then((result) => {
        startTransition(() => {
          setRemoteDirectoryPath(nextPath);
          setRemoteEntries(result.entries);
        });
      })
      .catch((fileError) => {
        setError(
          fileError instanceof Error
            ? `Could not load workspace files: ${fileError.message}`
            : "Could not load workspace files."
        );
      })
      .finally(() => {
        setRemoteFilesLoading(false);
      });
  }, [bridgeUrl, connectionTarget, isLive, panel, remoteDirectoryPath, startTransition, workspaceRoot]);

  useEffect(() => {
    const fromUrl = normalizeBridgeUrl(searchParams.get("bridge") ?? "");
    const fromPairing = searchParams.get("pair") ?? "";
    const storedSession =
      typeof window !== "undefined"
        ? parseManagedSession(window.localStorage.getItem(STORED_SESSION_KEY))
        : null;
    const fromStorage =
      typeof window !== "undefined"
        ? normalizeBridgeUrl(window.localStorage.getItem(STORED_BRIDGE_KEY) ?? "")
        : "";
    const nextBridge = fromUrl || fromStorage || "http://127.0.0.1:42420";
    setBridgeUrl(nextBridge);
    if (fromPairing) {
      void connectFromPairing(fromPairing);
    } else if (fromUrl) {
      void connect(fromUrl);
    } else if (storedSession) {
      void connectFromSession(storedSession);
    }
    return () => socketRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connectFromPairing(pairingUri: string) {
    setError("");
    setConnectionState("connecting");
    socketRef.current?.close();

    try {
      const claim = await claimPairing(pairingUri);
      if (!claim) {
        return connect(bridgeUrl);
      }
      window.localStorage.setItem(STORED_SESSION_KEY, serializeManagedSession(claim.session));
      const resolved = await resolveManagedConnection(claim.session);
      await connect(resolved.target, {
        transport: resolved.transport,
        persistUrl: claim.machines.find((machine) => machine.machineId === claim.session.machineId)?.localBridgeUrl,
      });
    } catch (connectError) {
      setConnectionState("offline");
      setError(
        connectError instanceof Error
          ? `Could not pair this machine: ${connectError.message}`
          : "Could not pair this machine."
      );
    }
  }

  async function connectFromSession(session: ManagedSession) {
    setError("");
    setConnectionState("connecting");
    socketRef.current?.close();

    try {
      const resolved = await resolveManagedConnection(session);
      await connect(resolved.target, { transport: resolved.transport });
    } catch (connectError) {
      setConnectionState("offline");
      setError(
        connectError instanceof Error
          ? `Could not reconnect to this machine: ${connectError.message}`
          : "Could not reconnect to this machine."
      );
    }
  }

  async function connectFromInput() {
    const pairingUri = extractPairingUri(bridgeUrl);
    if (pairingUri) {
      await connectFromPairing(pairingUri);
      return;
    }
    await connect();
  }

  async function connect(
    target = bridgeUrl,
    options?: { transport?: ConnectionTransport; persistUrl?: string }
  ) {
    const nextBridgeUrl = normalizeBridgeUrl(target);
    if (!nextBridgeUrl) return;

    setError("");
    setConnectionState("connecting");
    socketRef.current?.close();

    try {
      const [nextHealth, nextSnapshot, nextInventory] = await Promise.all([
        fetchBridgeHealth(nextBridgeUrl),
        fetchBridgeSnapshot(nextBridgeUrl),
        fetchBridgeInventory(nextBridgeUrl).catch(() => null),
      ]);
      const displayBridgeUrl =
        options?.persistUrl ?? (options?.transport === "relay" ? bridgeUrl : nextBridgeUrl);

      if (displayBridgeUrl) {
        window.localStorage.setItem(STORED_BRIDGE_KEY, displayBridgeUrl);
      }
      startTransition(() => {
        setBridgeUrl(displayBridgeUrl || nextBridgeUrl);
        setConnectionTarget(nextBridgeUrl);
        setConnectionTransport(options?.transport ?? "local");
        setHealth(nextHealth);
        setSnapshot(nextSnapshot);
        setInventory(nextInventory);
        setSelectedThreadId(nextSnapshot.threads[0]?.id ?? OFFDEX_NEW_THREAD_ID);
        setConnectionState("live");
      });

      const socket = new WebSocket(liveUrlForConnection(nextBridgeUrl));
      socketRef.current = socket;
      socket.onmessage = (event) => {
        const nextSnapshotMessage = readLiveSnapshotMessage(nextBridgeUrl, event.data as string);
        if (nextSnapshotMessage) {
          startTransition(() => {
            setSnapshot(nextSnapshotMessage);
          });
        }
      };
      socket.onclose = () => {
        setConnectionState((current) => current === "live" ? "offline" : current);
      };
    } catch (connectError) {
      setConnectionState("offline");
      setConnectionTarget("");
      setConnectionTransport(null);
      setError(
        connectError instanceof Error
          ? `Could not connect to ${nextBridgeUrl}: ${connectError.message}`
          : `Could not connect to ${nextBridgeUrl}`
      );
    }
  }

  async function refreshInventory() {
    try {
      const nextInventory = await fetchBridgeInventory(connectionTarget || bridgeUrl);
      startTransition(() => {
        setInventory(nextInventory);
      });
    } catch (inventoryError) {
      setError(
        inventoryError instanceof Error
          ? `Could not load machine inventory: ${inventoryError.message}`
          : "Could not load machine inventory."
      );
    }
  }

  async function changeRuntime(preferredTarget: "cli" | "desktop") {
    try {
      const result = await sendBridgeRuntime(connectionTarget || bridgeUrl, preferredTarget);
      startTransition(() => {
        setSnapshot(result.snapshot);
      });
    } catch (runtimeError) {
      setError(
        runtimeError instanceof Error
          ? `Could not change runtime: ${runtimeError.message}`
          : "Could not change runtime."
      );
    }
  }

  async function writeConfigValue(keyPath: string, value: unknown) {
    try {
      const result = await sendBridgeConfigWrite(connectionTarget || bridgeUrl, {
        keyPath,
        value,
      });
      startTransition(() => {
        setInventory(result.inventory);
      });
    } catch (configError) {
      setError(
        configError instanceof Error
          ? `Could not update settings: ${configError.message}`
          : "Could not update settings."
      );
    }
  }

  async function toggleSkill(_name: string, path: string, enabled: boolean) {
    try {
      const result = await sendBridgeSkillConfigWrite(connectionTarget || bridgeUrl, {
        name: null,
        path,
        enabled,
      });
      startTransition(() => {
        setInventory(result.inventory);
      });
    } catch (skillError) {
      setError(
        skillError instanceof Error
          ? `Could not update this skill: ${skillError.message}`
          : "Could not update this skill."
      );
    }
  }

  async function installPlugin(marketplacePath: string, pluginName: string) {
    try {
      const result = await sendBridgePluginInstall(connectionTarget || bridgeUrl, {
        marketplacePath,
        pluginName,
      });
      startTransition(() => {
        setInventory(result.inventory);
      });
    } catch (pluginError) {
      setError(
        pluginError instanceof Error
          ? `Could not install this plugin: ${pluginError.message}`
          : "Could not install this plugin."
      );
    }
  }

  async function uninstallPlugin(pluginId: string) {
    try {
      const result = await sendBridgePluginUninstall(connectionTarget || bridgeUrl, pluginId);
      startTransition(() => {
        setInventory(result.inventory);
      });
    } catch (pluginError) {
      setError(
        pluginError instanceof Error
          ? `Could not uninstall this plugin: ${pluginError.message}`
          : "Could not uninstall this plugin."
      );
    }
  }

  async function loadRemoteDirectory(path: string) {
    if (!path) {
      return;
    }

    setRemoteFilesLoading(true);
    try {
      const result = await fetchBridgeFiles(connectionTarget || bridgeUrl, path);
      startTransition(() => {
        setRemoteDirectoryPath(path);
        setRemoteEntries(result.entries);
        setRemoteFileQuery("");
        setRemoteFileMatches([]);
      });
    } catch (fileError) {
      setError(
        fileError instanceof Error
          ? `Could not load workspace files: ${fileError.message}`
          : "Could not load workspace files."
      );
    } finally {
      setRemoteFilesLoading(false);
    }
  }

  async function runRemoteFileSearch(query: string) {
    setRemoteFileQuery(query);
    if (!query.trim() || !workspaceRoot) {
      setRemoteFileMatches([]);
      return;
    }

    setRemoteFilesLoading(true);
    try {
      const result = await searchBridgeFiles(connectionTarget || bridgeUrl, query.trim(), [workspaceRoot]);
      startTransition(() => {
        setRemoteFileMatches(result.files);
      });
    } catch (fileError) {
      setError(
        fileError instanceof Error
          ? `Could not search workspace files: ${fileError.message}`
          : "Could not search workspace files."
      );
    } finally {
      setRemoteFilesLoading(false);
    }
  }

  function attachWorkspacePath(path: string) {
    const name = path.split("/").pop() || path;
    const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
    setAttachments((current) => [
      ...current,
      {
        id: `${path}-${Date.now()}`,
        name,
        kind: "workspace",
        preview: path,
        input: isImage
          ? ({ type: "localImage", path } satisfies OffdexInputItem)
          : ({ type: "mention", name, path } satisfies OffdexInputItem),
      },
    ]);
    setPanel(null);
  }

  async function appendFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) {
      return;
    }

    try {
      const nextAttachments = await Promise.all(
        files.map(async (file) => {
          if (file.type.startsWith("image/")) {
            const dataUrl = await readFileAsDataUrl(file);
            return {
              id: `${file.name}-${Date.now()}`,
              name: file.name,
              kind: "image" as const,
              preview: file.name,
              input: { type: "image", url: dataUrl } satisfies OffdexInputItem,
            };
          }

          const contents = await readFileAsText(file);
          const trimmedContents = contents.length > 60_000 ? `${contents.slice(0, 60_000)}\n…` : contents;
          return {
            id: `${file.name}-${Date.now()}`,
            name: file.name,
            kind: "text" as const,
            preview: file.name,
            input: {
              type: "text",
              text: `[Attached file: ${file.name}]\n${trimmedContents}`,
            } satisfies OffdexInputItem,
          };
        })
      );

      setAttachments((current) => [...current, ...nextAttachments]);
    } catch (attachmentError) {
      setError(
        attachmentError instanceof Error
          ? attachmentError.message
          : "Could not attach those files."
      );
    }
  }

  async function onFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files?.length) {
      return;
    }

    await appendFiles(event.target.files);
    event.target.value = "";
  }

  async function onComposerPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.items)
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));

    if (files.length === 0) {
      return;
    }

    event.preventDefault();
    await appendFiles(files);
  }

  async function sendTurn() {
    const body = draft.trim();
    if ((!body && attachments.length === 0) || !isLive || !codexReady) return;
    const previousThreadIds = new Set(threads.map((thread) => thread.id));
    const activeThreadId = selectedThread?.id ?? OFFDEX_NEW_THREAD_ID;
    const nextInputs: OffdexInputItem[] = [
      ...(body ? [{ type: "text", text: body } satisfies OffdexInputItem] : []),
      ...attachments.map((attachment) => attachment.input),
    ];
    const previousAttachments = attachments;

    setDraft("");
    setAttachments([]);
    setError("");

    try {
      const result = await sendBridgeTurn(
        connectionTarget || bridgeUrl,
        activeThreadId,
        body,
        nextInputs
      );
      const createdThread =
        activeThreadId === OFFDEX_NEW_THREAD_ID
          ? result.snapshot.threads.find((thread) => !previousThreadIds.has(thread.id))
          : null;
      const nextSelectedThreadId =
        createdThread?.id ??
        result.snapshot.threads.find((thread) => thread.id === activeThreadId)?.id ??
        result.snapshot.threads[0]?.id ??
        selectedThreadId;
      startTransition(() => {
        setSnapshot(result.snapshot);
        setSelectedThreadId(nextSelectedThreadId);
      });
    } catch (sendError) {
      setDraft(body);
      setAttachments(previousAttachments);
      setError(
        sendError instanceof Error
          ? `Codex did not accept that turn: ${sendError.message}`
          : "Codex did not accept that turn."
      );
    }
  }

  async function interruptSelectedThread() {
    if (!selectedThread || !isLive) return;
    try {
      const result = await sendBridgeInterrupt(connectionTarget || bridgeUrl, selectedThread.id);
      startTransition(() => {
        setSnapshot(result.snapshot);
      });
    } catch (interruptError) {
      setError(
        interruptError instanceof Error
          ? `Could not interrupt this turn: ${interruptError.message}`
          : "Could not interrupt this turn."
      );
    }
  }

  async function answerApproval(approval: OffdexApprovalRequest, approve: boolean) {
    try {
      const parsedAnswers =
        approval.inputSchema === "answers"
          ? JSON.parse(approvalAnswers[approval.id] || "{}") as Record<string, string>
          : undefined;
      const result = await sendBridgeApproval(connectionTarget || bridgeUrl, approval, {
        approve,
        answers: parsedAnswers,
      });
      startTransition(() => {
        setSnapshot(result.snapshot);
      });
    } catch (approvalError) {
      setError(
        approvalError instanceof Error
          ? `Could not resolve approval: ${approvalError.message}`
          : "Could not resolve approval."
      );
    }
  }

  async function renameSelectedThread() {
    if (!selectedThread || !isLive) return;
    const nextName = window.prompt("Rename thread", selectedThread.title)?.trim();
    if (!nextName || nextName === selectedThread.title) return;

    try {
      const result = await sendBridgeThreadRename(connectionTarget || bridgeUrl, selectedThread.id, nextName);
      startTransition(() => {
        setSnapshot(result.snapshot);
      });
    } catch (threadError) {
      setError(
        threadError instanceof Error
          ? `Could not rename this thread: ${threadError.message}`
          : "Could not rename this thread."
      );
    }
  }

  async function forkSelectedThread() {
    if (!selectedThread || !isLive) return;
    try {
      const result = await sendBridgeThreadFork(connectionTarget || bridgeUrl, selectedThread.id);
      startTransition(() => {
        setSnapshot(result.snapshot);
        setSelectedThreadId(result.snapshot.threads[0]?.id ?? selectedThread.id);
      });
    } catch (threadError) {
      setError(
        threadError instanceof Error
          ? `Could not fork this thread: ${threadError.message}`
          : "Could not fork this thread."
      );
    }
  }

  async function archiveSelectedThread() {
    if (!selectedThread || !isLive) return;
    if (!window.confirm(`Archive "${selectedThread.title}"?`)) return;

    try {
      const result = await sendBridgeThreadArchive(connectionTarget || bridgeUrl, selectedThread.id);
      startTransition(() => {
        setSnapshot(result.snapshot);
        setSelectedThreadId(result.snapshot.threads[0]?.id ?? OFFDEX_NEW_THREAD_ID);
      });
    } catch (threadError) {
      setError(
        threadError instanceof Error
          ? `Could not archive this thread: ${threadError.message}`
          : "Could not archive this thread."
      );
    }
  }

  async function unarchiveThread(threadId: string) {
    if (!isLive) return;

    try {
      const result = await sendBridgeThreadUnarchive(connectionTarget || bridgeUrl, threadId);
      startTransition(() => {
        setSnapshot(result.snapshot);
        setSelectedThreadId(result.snapshot.threads[0]?.id ?? OFFDEX_NEW_THREAD_ID);
      });
    } catch (threadError) {
      setError(
        threadError instanceof Error
          ? `Could not restore this thread: ${threadError.message}`
          : "Could not restore this thread."
      );
    }
  }

  async function compactSelectedThread() {
    if (!selectedThread || !isLive) return;

    try {
      const result = await sendBridgeThreadCompact(connectionTarget || bridgeUrl, selectedThread.id);
      startTransition(() => {
        setSnapshot(result.snapshot);
      });
    } catch (threadError) {
      setError(
        threadError instanceof Error
          ? `Could not compact this thread: ${threadError.message}`
          : "Could not compact this thread."
      );
    }
  }

  async function reviewSelectedThread() {
    if (!selectedThread || !isLive) return;

    try {
      const result = await sendBridgeReview(connectionTarget || bridgeUrl, selectedThread.id);
      startTransition(() => {
        setSnapshot(result.snapshot);
      });
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? `Could not start review: ${reviewError.message}`
          : "Could not start review."
      );
    }
  }

  async function loginMcpServer(name: string) {
    try {
      const result = await sendBridgeMcpOauthLogin(connectionTarget || bridgeUrl, name);
      window.open(result.authorizationUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => {
        void refreshInventory();
      }, 2_000);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? `Could not start connector login: ${loginError.message}`
          : "Could not start connector login."
      );
    }
  }

  const projectThreadGroups = threads.reduce<Array<{ name: string; threads: OffdexThread[] }>>(
    (groups, thread) => {
      if (!threadMatchesFilter(thread, threadFilter)) {
        return groups;
      }
      const name = thread.projectLabel || "workspace";
      const existingGroup = groups.find((group) => group.name === name);
      if (existingGroup) {
        existingGroup.threads.push(thread);
        return groups;
      }
      groups.push({ name, threads: [thread] });
      return groups;
    },
    []
  );

  return (
    <section className="flex h-dvh min-h-0 w-full overflow-hidden bg-background text-foreground">
      <aside className="flex h-full w-[280px] shrink-0 flex-col bg-muted shadow-border">
        <div className="flex h-[48px] items-center justify-between px-4">
          <span className="text-[13px] font-semibold text-foreground">Offdex</span>
          <button aria-label="Toggle sidebar" className="text-muted-foreground hover:text-foreground" type="button">
            <Icon name="collapse" className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-[2px] px-3 py-1">
          <button
            className="focus-ring flex h-[32px] items-center gap-2.5 rounded-md px-2 text-[13px] font-medium text-foreground hover:bg-black/5"
            onClick={() => setSelectedThreadId(OFFDEX_NEW_THREAD_ID)}
            type="button"
          >
            <Icon name="edit" className="h-[15px] w-[15px]" />
            New chat
          </button>
          <button
            className="focus-ring flex h-[32px] items-center gap-2.5 rounded-md px-2 text-[13px] text-muted-foreground hover:bg-black/5 hover:text-foreground"
            onClick={() => setPanel("search")}
            type="button"
          >
            <Icon name="search" className="h-[15px] w-[15px]" />
            Search
          </button>
          <button
            className="focus-ring flex h-[32px] items-center gap-2.5 rounded-md px-2 text-[13px] text-muted-foreground hover:bg-black/5 hover:text-foreground"
            onClick={() => setPanel("history")}
            type="button"
          >
            <Icon name="archive" className="h-[15px] w-[15px]" />
            History
          </button>
          <button
            className="focus-ring flex h-[32px] items-center gap-2.5 rounded-md px-2 text-[13px] text-muted-foreground hover:bg-black/5 hover:text-foreground"
            onClick={() => {
              void refreshInventory();
              setPanel("plugins");
            }}
            type="button"
          >
            <Icon name="plugins" className="h-[15px] w-[15px]" />
            Plugins
          </button>
          <button
            className="focus-ring flex h-[32px] items-center gap-2.5 rounded-md px-2 text-[13px] text-muted-foreground hover:bg-black/5 hover:text-foreground"
            onClick={() => {
              void refreshInventory();
              setPanel("apps");
            }}
            type="button"
          >
            <Icon name="plug" className="h-[15px] w-[15px]" />
            Apps
          </button>
          <button
            className="focus-ring flex h-[32px] items-center gap-2.5 rounded-md px-2 text-[13px] text-muted-foreground hover:bg-black/5 hover:text-foreground"
            onClick={() => {
              void refreshInventory();
              setPanel("automations");
            }}
            type="button"
          >
            <Icon name="automations" className="h-[15px] w-[15px]" />
            Automations
          </button>
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 scrollbar-hide">
          <div className="flex items-center justify-between px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
            <span>Projects</span>
            <span>{threads.length}</span>
          </div>
          <input
            className="focus-ring mt-2 w-full rounded-xl bg-background px-3 py-2 text-sm text-foreground shadow-border"
            onChange={(event) => setThreadFilter(event.target.value)}
            placeholder="Filter threads"
            value={threadFilter}
          />
          <div className="mt-1 space-y-3">
            {projectThreadGroups.length > 0 ? projectThreadGroups.map((group) => (
              <div key={group.name}>
                <div className="flex h-7 items-center gap-2 px-2 text-[13px] font-medium text-foreground">
                  <Icon name="folder" className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate">{group.name}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">{group.threads.length}</span>
                </div>
                <div className="mt-[2px] flex flex-col gap-[2px]">
                  {group.threads.map((thread) => {
                    const isActive = thread.id === selectedThread?.id;
                    return (
                      <button
                        className={`focus-ring flex min-h-[36px] w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-[13px] ${
                          isActive
                            ? "bg-background font-medium text-foreground shadow-border"
                            : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                        }`}
                        key={thread.id}
                        onClick={() => setSelectedThreadId(thread.id)}
                        type="button"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block truncate leading-tight">{thread.title}</span>
                          <span className="mt-1 block truncate text-[11px] opacity-60">
                            {thread.gitInfo?.branch ?? thread.cwd ?? thread.projectLabel}
                          </span>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-[11px] opacity-50">{thread.updatedAt}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] shadow-border ${toneForStatus(thread.state)}`}>
                            {thread.state}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )) : (
              <div className="rounded-2xl bg-background px-4 py-5 text-sm text-muted-foreground shadow-card">
                {threadFilter.trim() ? "No loaded threads matched that filter." : "No live threads are loaded yet."}
              </div>
            )}
          </div>
        </div>

        <div className="relative p-3">
          <button
            className="focus-ring flex h-[32px] w-full items-center gap-2.5 rounded-md px-2 text-[13px] font-medium text-muted-foreground hover:bg-black/5 hover:text-foreground"
            onClick={() => setPanel("settings")}
            type="button"
          >
            <Icon name="settings" className="h-[15px] w-[15px]" />
            Settings
          </button>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1">
        <div className="relative flex min-w-0 flex-1 flex-col bg-background">
          <header className="absolute inset-x-0 top-0 z-10 flex h-[48px] items-center justify-between bg-background/88 px-5 backdrop-blur-sm">
            <div className="min-w-0">
              <h1 className="truncate text-[13px] font-semibold text-foreground">
                {isDraftThread ? "New chat" : selectedThread?.title ?? "New chat"}
              </h1>
              <p className="truncate text-[11px] text-muted-foreground">
                {selectedThread?.cwd ?? health?.bridgeUrl ?? bridgeUrl}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <span className="rounded-full bg-muted px-3 py-1 shadow-border">
                {health?.bridgeMode ?? "bridge"}
              </span>
              <span className="rounded-full bg-muted px-3 py-1 shadow-border">
                {selectedThread?.gitInfo?.branch ?? "main"}
              </span>
              {activeDiffTurn?.diff ? (
                <button
                  className="focus-ring rounded-full bg-muted px-3 py-1.5 text-foreground shadow-border"
                  onClick={() => setPanel("diff")}
                  type="button"
                >
                  Diff
                </button>
              ) : null}
              {selectedThread ? (
                <button
                  className="focus-ring rounded-full bg-muted px-3 py-1.5 text-foreground shadow-border"
                  disabled={selectedThread.state === "running"}
                  onClick={() => void compactSelectedThread()}
                  type="button"
                >
                  Compact
                </button>
              ) : null}
              {selectedThread ? (
                <button
                  className="focus-ring rounded-full bg-muted px-3 py-1.5 text-foreground shadow-border"
                  disabled={selectedThread.state === "running"}
                  onClick={() => void reviewSelectedThread()}
                  type="button"
                >
                  Review
                </button>
              ) : null}
              {selectedThread ? (
                <>
                  <button
                    className="focus-ring rounded-full bg-muted px-3 py-1.5 text-foreground shadow-border"
                    onClick={() => void renameSelectedThread()}
                    type="button"
                  >
                    Rename
                  </button>
                  <button
                    className="focus-ring rounded-full bg-muted px-3 py-1.5 text-foreground shadow-border"
                    onClick={() => void forkSelectedThread()}
                    type="button"
                  >
                    Fork
                  </button>
                  <button
                    className="focus-ring rounded-full bg-muted px-3 py-1.5 text-foreground shadow-border"
                    onClick={() => void archiveSelectedThread()}
                    type="button"
                  >
                    Archive
                  </button>
                </>
              ) : null}
              {selectedThread?.state === "running" ? (
                <button
                  className="focus-ring flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-background"
                  onClick={() => void interruptSelectedThread()}
                  type="button"
                >
                  <Icon name="stop" className="h-3.5 w-3.5" />
                  Stop
                </button>
              ) : null}
            </div>
          </header>

          <section className="h-full overflow-y-auto px-6 pb-[190px] pt-[60px]">
            {!isLive ? (
              <div className="mx-auto mt-16 max-w-[700px] rounded-[28px] bg-background p-8 shadow-card">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-muted p-3 shadow-border">
                    <Icon name="cloud" className="h-8 w-8 text-foreground" />
                  </div>
                  <div>
                    <h2 className="text-[28px] font-semibold tracking-[-0.08em] text-foreground">Connect to your bridge</h2>
                    <p className="mt-2 text-[15px] text-muted-foreground">
                      Offdex web stays thin. Your Mac bridge keeps the Codex session, tools, and permissions.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <input
                    className="focus-ring min-w-0 flex-1 rounded-full bg-muted px-4 py-3 font-mono text-sm text-foreground shadow-border"
                    onChange={(event) => setBridgeUrl(event.target.value)}
                    placeholder="http://127.0.0.1:42420 or offdex://pair..."
                    value={bridgeUrl}
                  />
                  <button
                    className="focus-ring rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background disabled:opacity-50"
                    disabled={connectionState === "connecting"}
                    onClick={() => void connectFromInput()}
                    type="button"
                  >
                    {connectionState === "connecting" ? "Connecting..." : "Connect"}
                  </button>
                </div>
              </div>
            ) : flattenedItems.length > 0 ? (
              <div className="mx-auto flex w-full max-w-[840px] flex-col gap-5 py-6">
                {flattenedItems.map(({ item, turn }) => (
                  <TimelineRow item={item} key={`${turn.id}-${item.id}`} turn={turn} />
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center">
                  <Icon name="cloud" className="h-[42px] w-[42px] text-foreground" />
                  <h2 className="mt-4 text-[24px] font-semibold tracking-[-0.06em] text-foreground">Start a new Codex thread</h2>
                  <p className="mt-2 text-[15px] text-muted-foreground">{snapshot?.account?.email ?? "Connected to your bridge"}</p>
                </div>
              </div>
            )}
          </section>

          <div className="absolute inset-x-0 bottom-6 flex justify-center px-6">
            <div className="w-full max-w-[840px]">
              {error ? (
                <p className="mb-3 rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm text-[#b42318] shadow-border">{error}</p>
              ) : null}
              <div className="rounded-[24px] bg-background shadow-card">
                <input
                  className="hidden"
                  multiple
                  onChange={(event) => void onFileInputChange(event)}
                  ref={fileInputRef}
                  type="file"
                />
                {attachments.length > 0 ? (
                  <div className="flex flex-wrap gap-2 px-4 pt-4">
                    {attachments.map((attachment) => (
                      <button
                        className="focus-ring rounded-full bg-muted px-3 py-1.5 text-[12px] text-foreground shadow-border"
                        key={attachment.id}
                        onClick={() =>
                          setAttachments((current) => current.filter((entry) => entry.id !== attachment.id))
                        }
                        type="button"
                      >
                        {attachment.kind === "image" ? "Image" : attachment.kind === "workspace" ? "Workspace" : "File"} · {attachment.preview}
                      </button>
                    ))}
                  </div>
                ) : null}
                <textarea
                  className="min-h-[72px] w-full resize-none bg-transparent px-5 pt-4 text-[15px] leading-7 text-foreground placeholder:text-muted-foreground outline-none"
                  disabled={!isLive || !codexReady || isPending}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      void sendTurn();
                    }
                  }}
                  onPaste={(event) => void onComposerPaste(event)}
                  placeholder="Ask Codex anything, @ to add files, / for commands, $ for skills"
                  rows={3}
                  value={draft}
                />
                <div className="flex items-center justify-between px-3 pb-3">
                  <div className="flex items-center gap-1">
                    <button
                      aria-label="Open files panel"
                      className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => setPanel("files")}
                      type="button"
                    >
                      <Icon name="plus" className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="Open settings"
                      className="rounded-full px-3 py-2 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => setPanel("settings")}
                      type="button"
                    >
                      {inventory?.config?.model ?? "Default model"}
                    </button>
                    <button
                      aria-label="Open settings"
                      className="rounded-full px-3 py-2 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => setPanel("settings")}
                      type="button"
                    >
                      {inventory?.config?.reasoningEffort ?? "Default effort"}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      aria-label="Send message"
                      className="focus-ring grid h-10 w-10 place-items-center rounded-full bg-foreground text-background disabled:cursor-not-allowed disabled:opacity-30"
                      disabled={!canSend}
                      onClick={() => void sendTurn()}
                      type="button"
                    >
                      <Icon name="arrow-up" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between px-1 font-mono text-[11px] text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>{connectionTransport ?? "local"}</span>
                  <span>{health?.bridgeMode ?? "bridge"}</span>
                  <span>{snapshot?.account?.email ?? "not signed in"}</span>
                </div>
                <div>{selectedThread?.gitInfo?.branch ?? "main"}</div>
              </div>
            </div>
          </div>
        </div>

        {panel ? (
          <div className="absolute inset-0 z-30 flex justify-end bg-black/20">
            <button
              aria-label="Close panel"
              className="flex-1"
              onClick={() => setPanel(null)}
              type="button"
            />
            <section className="flex h-full w-full max-w-[420px] flex-col bg-background p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{panelTitle(panel)}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {panel === "search"
                      ? "Find threads and transcript history already loaded into this session."
                      : panel === "history"
                        ? "Browse archived Codex threads and restore them back into your active workspace."
                      : panel === "plugins"
                        ? "Inspect the machine-local skills and plugin bundles available to Codex."
                        : panel === "apps"
                          ? "Inspect the live app and connector inventory exposed by the Codex runtime."
                          : panel === "automations"
                            ? "Inspect the recurring jobs that this Codex environment currently knows about."
                          : panel === "files"
                            ? "Browse or search your Mac workspace and attach files as Codex context."
                            : panel === "diff"
                              ? "Inspect the latest unified diff streamed for this turn."
                          : "Bridge, runtime, and account controls for this machine."}
                  </p>
                </div>
                <button
                  className="focus-ring rounded-full bg-muted px-3 py-2 text-xs font-medium text-foreground shadow-border"
                  onClick={() => setPanel(null)}
                  type="button"
                >
                  Close
                </button>
              </div>

              {panel === "search" ? (
                <div className="mt-5 flex min-h-0 flex-1 flex-col">
                  <input
                    autoFocus
                    className="focus-ring rounded-2xl bg-muted px-4 py-3 text-sm text-foreground shadow-border"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search thread titles and transcript text"
                    value={searchQuery}
                  />
                  <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      <div className="space-y-2">
                        {searchResults.map((entry) => (
                          <button
                            className="focus-ring w-full rounded-2xl bg-muted px-4 py-3 text-left shadow-border hover:bg-black/5"
                            key={entry.id}
                            onClick={() => {
                              setSelectedThreadId(entry.threadId);
                              setPanel(null);
                            }}
                            type="button"
                          >
                            <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                            <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">{entry.snippet}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-muted px-4 py-5 text-sm text-muted-foreground shadow-border">
                        {searchQuery.trim()
                          ? "No matching threads or transcript rows in the current snapshot."
                          : "Start typing to search loaded threads, messages, and command output."}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {panel === "history" ? (
                <div className="mt-5 flex min-h-0 flex-1 flex-col">
                  <input
                    autoFocus
                    className="focus-ring rounded-2xl bg-muted px-4 py-3 text-sm text-foreground shadow-border"
                    onChange={(event) => setArchivedQuery(event.target.value)}
                    placeholder="Search archived threads"
                    value={archivedQuery}
                  />
                  <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
                    {archivedResults.length > 0 ? (
                      <div className="space-y-2">
                        {archivedResults.map((thread) => (
                          <article className="rounded-2xl bg-muted px-4 py-3 shadow-border" key={thread.id}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-foreground">{thread.title}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {thread.projectLabel} · {thread.updatedAt}
                                </p>
                                {thread.messages[0]?.body ? (
                                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                                    {thread.messages[0].body}
                                  </p>
                                ) : null}
                              </div>
                              <button
                                className="focus-ring shrink-0 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-medium text-background"
                                onClick={() => void unarchiveThread(thread.id)}
                                type="button"
                              >
                                Restore
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-muted px-4 py-5 text-sm text-muted-foreground shadow-border">
                        {archivedQuery.trim()
                          ? "No archived threads matched that search."
                          : "No archived threads are available from this Codex workspace."}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {panel === "plugins" ? (
                <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
                  <div className="rounded-2xl bg-muted p-4 shadow-border">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Code home</p>
                    <p className="mt-2 text-sm text-foreground">{inventory?.codeHome ?? "Unavailable"}</p>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-foreground">Plugins</h3>
                    <div className="mt-2 space-y-2">
                      {(inventory?.plugins ?? []).length > 0 ? (
                        inventory!.plugins.map((plugin) => (
                          <article className="rounded-2xl bg-muted p-4 shadow-border" key={plugin.id}>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{plugin.name}</p>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {plugin.enabled === false ? "disabled" : plugin.installed === false ? "available" : "enabled"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-background px-3 py-1 text-[11px] text-muted-foreground shadow-border">
                                  {plugin.enabled === false ? "disabled" : plugin.installed === false ? "available" : "enabled"}
                                </span>
                                {plugin.installed === false && plugin.marketplacePath && plugin.pluginName ? (
                                  <button
                                    className="focus-ring rounded-full bg-foreground px-3 py-1.5 text-[11px] font-medium text-background"
                                    disabled={isPending}
                                    onClick={() => void installPlugin(plugin.marketplacePath!, plugin.pluginName!)}
                                    type="button"
                                  >
                                    Install
                                  </button>
                                ) : plugin.installed !== false ? (
                                  <button
                                    className="focus-ring rounded-full bg-background px-3 py-1.5 text-[11px] font-medium text-foreground shadow-border"
                                    disabled={isPending}
                                    onClick={() => void uninstallPlugin(plugin.id)}
                                    type="button"
                                  >
                                    Uninstall
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {plugin.developer ?? plugin.source}
                              {plugin.category ? ` · ${plugin.category}` : ""}
                            </p>
                            {plugin.description ? (
                              <p className="mt-2 text-sm leading-6 text-foreground">{plugin.description}</p>
                            ) : null}
                            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{plugin.path}</p>
                          </article>
                        ))
                      ) : (
                        <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground shadow-border">
                          No local plugin bundles were discovered in this Codex home.
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-foreground">Skills</h3>
                    <div className="mt-2 space-y-2">
                      {(inventory?.skills ?? []).length > 0 ? (
                        inventory!.skills.map((skill) => (
                          <article className="rounded-2xl bg-muted p-4 shadow-border" key={skill.id}>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{skill.name}</p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                  {skill.scope ?? skill.source}
                                </p>
                              </div>
                              <button
                                aria-label={`${skill.enabled === false ? "Enable" : "Disable"} ${skill.name}`}
                                className={`focus-ring rounded-full px-3 py-1.5 text-[11px] font-medium ${
                                  skill.enabled === false
                                    ? "bg-background text-foreground shadow-border"
                                    : "bg-foreground text-background"
                                }`}
                                disabled={isPending}
                                onClick={() => void toggleSkill(skill.name, skill.path, !(skill.enabled !== false))}
                                type="button"
                              >
                                {skill.enabled === false ? "Enable" : "Disable"}
                              </button>
                            </div>
                            {skill.description ? (
                              <p className="mt-2 text-sm leading-6 text-foreground">{skill.description}</p>
                            ) : null}
                            <p className="mt-2 font-mono text-[11px] text-muted-foreground">{skill.path}</p>
                          </article>
                        ))
                      ) : (
                        <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground shadow-border">
                          No skill manifests were discovered on this machine.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {panel === "apps" ? (
                <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
                  <div className="space-y-5">
                    <section>
                      <h3 className="text-sm font-semibold text-foreground">Connectors</h3>
                      <div className="mt-2 space-y-2">
                        {(inventory?.mcpServers ?? []).length > 0 ? (
                          inventory!.mcpServers.map((server) => (
                            <article className="rounded-2xl bg-muted p-4 shadow-border" key={server.name}>
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-foreground">{server.name}</p>
                                <span className="rounded-full bg-background px-3 py-1 text-[11px] text-muted-foreground shadow-border">
                                  {server.authStatus}
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {server.toolCount} tools · {server.resourceCount} resources · {server.resourceTemplateCount} templates
                              </p>
                              {server.authStatus === "notLoggedIn" ? (
                                <button
                                  className="focus-ring mt-3 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background"
                                  onClick={() => void loginMcpServer(server.name)}
                                  type="button"
                                >
                                  Log in
                                </button>
                              ) : null}
                            </article>
                          ))
                        ) : (
                          <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground shadow-border">
                            No MCP connector status was returned by this Codex session.
                          </div>
                        )}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-sm font-semibold text-foreground">Apps</h3>
                      <div className="mt-2 space-y-2">
                        {(inventory?.apps ?? []).length > 0 ? (
                          inventory!.apps!.map((app) => (
                            <article className="rounded-2xl bg-muted p-4 shadow-border" key={app.id}>
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-foreground">{app.name}</p>
                                <span className="rounded-full bg-background px-3 py-1 text-[11px] text-muted-foreground shadow-border">
                                  {app.isAccessible ? "available" : "restricted"}
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {app.developer ?? "Unknown developer"}
                                {app.category ? ` · ${app.category}` : ""}
                                {app.distributionChannel ? ` · ${app.distributionChannel}` : ""}
                              </p>
                              {app.description ? (
                                <p className="mt-2 text-sm leading-6 text-foreground">{app.description}</p>
                              ) : null}
                              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                                {app.installUrl ?? app.websiteUrl ?? app.id}
                              </p>
                            </article>
                          ))
                        ) : (
                          <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground shadow-border">
                            No runtime apps were returned by this Codex session.
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              ) : null}

              {panel === "automations" ? (
                <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
                  <div className="rounded-2xl bg-muted p-4 shadow-border">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Automations</p>
                    <p className="mt-2 text-sm text-foreground">
                      {(inventory?.automations ?? []).length > 0
                        ? `${inventory!.automations.length} automations available in this Codex home.`
                        : "No automations were discovered for this Codex environment."}
                    </p>
                  </div>
                  <div className="mt-4 space-y-2">
                    {(inventory?.automations ?? []).length > 0 ? (
                      inventory!.automations.map((automation) => (
                        <AutomationCard automation={automation} key={automation.id} />
                      ))
                    ) : (
                      <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground shadow-border">
                        Create automations from Codex Desktop or the Codex app shell and they will appear here.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {panel === "files" ? (
                <div className="mt-5 flex min-h-0 flex-1 flex-col">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="focus-ring rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background"
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      Upload from this device
                    </button>
                    {workspaceRoot ? (
                      <button
                        className="focus-ring rounded-full bg-muted px-4 py-2 text-xs font-medium text-foreground shadow-border"
                        onClick={() => void loadRemoteDirectory(workspaceRoot)}
                        type="button"
                      >
                        Workspace root
                      </button>
                    ) : null}
                    {remoteDirectoryPath && remoteDirectoryPath !== workspaceRoot ? (
                      <button
                        className="focus-ring rounded-full bg-muted px-4 py-2 text-xs font-medium text-foreground shadow-border"
                        onClick={() => void loadRemoteDirectory(parentDirectory(remoteDirectoryPath))}
                        type="button"
                      >
                        Up one level
                      </button>
                    ) : null}
                  </div>
                  <input
                    className="focus-ring mt-4 rounded-2xl bg-muted px-4 py-3 text-sm text-foreground shadow-border"
                    onChange={(event) => void runRemoteFileSearch(event.target.value)}
                    placeholder="Search files in the current workspace"
                    value={remoteFileQuery}
                  />
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {remoteDirectoryPath || workspaceRoot || "No workspace path available"}
                  </p>
                  <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
                    {remoteFilesLoading ? (
                      <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground shadow-border">
                        Loading workspace files...
                      </div>
                    ) : remoteFileQuery.trim() ? (
                      remoteFileMatches.length > 0 ? (
                        <div className="space-y-2">
                          {remoteFileMatches.map((entry) => (
                            <div
                              className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3 shadow-border"
                              key={`${entry.path}-${entry.score}`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-foreground">{entry.name}</p>
                                <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{entry.path}</p>
                              </div>
                              <span className="ml-3 shrink-0 rounded-full bg-background px-3 py-1 text-[11px] text-muted-foreground shadow-border">
                                {entry.kind}
                              </span>
                              <button
                                className="focus-ring ml-3 shrink-0 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-medium text-background"
                                onClick={() => attachWorkspacePath(entry.path)}
                                type="button"
                              >
                                Attach
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground shadow-border">
                          No matching workspace files.
                        </div>
                      )
                    ) : remoteEntries.length > 0 ? (
                      <div className="space-y-2">
                        {remoteEntries.map((entry) => (
                          <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3 shadow-border" key={entry.path}>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">{entry.name}</p>
                              <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{entry.path}</p>
                            </div>
                            <span className="ml-3 shrink-0 rounded-full bg-background px-3 py-1 text-[11px] text-muted-foreground shadow-border">
                              {entry.isDirectory ? "dir" : "file"}
                            </span>
                            {entry.isDirectory ? (
                              <button
                                className="focus-ring ml-3 shrink-0 rounded-full bg-background px-3 py-1.5 text-[11px] font-medium text-foreground shadow-border"
                                onClick={() => void loadRemoteDirectory(entry.path)}
                                type="button"
                              >
                                Open
                              </button>
                            ) : (
                              <button
                                className="focus-ring ml-3 shrink-0 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-medium text-background"
                                onClick={() => attachWorkspacePath(entry.path)}
                                type="button"
                              >
                                Attach
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground shadow-border">
                        No workspace directory entries were returned.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {panel === "diff" ? (
                <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
                  {activeDiffTurn?.diff ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl bg-muted p-4 shadow-border">
                        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Review summary</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-background px-3 py-1 text-[11px] text-muted-foreground shadow-border">
                            {parsedDiffFiles.length} files
                          </span>
                          <span className="rounded-full bg-background px-3 py-1 text-[11px] text-[#027a48] shadow-border">
                            +{diffTotals.additions}
                          </span>
                          <span className="rounded-full bg-background px-3 py-1 text-[11px] text-[#b42318] shadow-border">
                            -{diffTotals.deletions}
                          </span>
                          <span className="rounded-full bg-background px-3 py-1 text-[11px] text-muted-foreground shadow-border">
                            turn {activeDiffTurn.id}
                          </span>
                        </div>
                      </div>

                      {parsedDiffFiles.length > 0 ? (
                        parsedDiffFiles.map((file) => (
                          <article className="rounded-2xl bg-muted p-4 shadow-border" key={file.id}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">{file.path}</p>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {file.previousPath ? `${file.previousPath} -> ${file.path}` : file.hunks[0] ?? "Unified diff"}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className="rounded-full bg-background px-3 py-1 text-[11px] text-[#027a48] shadow-border">
                                  +{file.additions}
                                </span>
                                <span className="rounded-full bg-background px-3 py-1 text-[11px] text-[#b42318] shadow-border">
                                  -{file.deletions}
                                </span>
                              </div>
                            </div>
                            <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-background px-3 py-3 font-mono text-[11px] leading-5 text-foreground shadow-border whitespace-pre-wrap">
                              {file.raw}
                            </pre>
                          </article>
                        ))
                      ) : (
                        <pre className="max-h-full overflow-auto rounded-2xl bg-muted p-4 font-mono text-[12px] leading-6 text-foreground shadow-border whitespace-pre-wrap">
                          {activeDiffTurn.diff}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground shadow-border">
                      No unified diff has been streamed for the selected thread yet.
                    </div>
                  )}
                </div>
              ) : null}

              {panel === "settings" ? (
                <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-muted p-4 shadow-border">
                      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Connection</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{connectionState}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{connectionTransport ?? "local"}</p>
                    </div>
                    <div className="rounded-2xl bg-muted p-4 shadow-border">
                      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Account</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{snapshot?.account?.email ?? "Not signed in"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{health?.bridgeMode ?? "bridge"}</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-muted p-4 shadow-border">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Usage</p>
                    {inventory?.rateLimits ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl bg-background p-3 shadow-border">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Primary window</p>
                          <p className="mt-2 text-sm font-semibold text-foreground">
                            {inventory.rateLimits.primary?.usedPercent ?? 0}% used
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {inventory.rateLimits.primary?.windowDurationMins ?? "?"} min · {formatRateLimitReset(inventory.rateLimits.primary?.resetsAt)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-background p-3 shadow-border">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Secondary window</p>
                          <p className="mt-2 text-sm font-semibold text-foreground">
                            {inventory.rateLimits.secondary?.usedPercent ?? 0}% used
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {inventory.rateLimits.secondary?.windowDurationMins ?? "?"} min · {formatRateLimitReset(inventory.rateLimits.secondary?.resetsAt)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-background p-3 shadow-border sm:col-span-2">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Plan and credits</p>
                          <p className="mt-2 text-sm font-semibold text-foreground">
                            {inventory.rateLimits.planType ?? snapshot?.account?.planType ?? "unknown plan"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {inventory.rateLimits.credits?.unlimited
                              ? "Unlimited credits"
                              : `Credits balance: ${inventory.rateLimits.credits?.balance ?? "0"}`}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        No live rate-limit data was returned by this Codex session.
                      </p>
                    )}
                  </div>
                  <div className="mt-4 rounded-2xl bg-muted p-4 shadow-border">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="bridge-link">
                      Bridge link
                    </label>
                    <input
                      className="focus-ring mt-2 w-full rounded-xl bg-background px-3 py-2 font-mono text-xs text-foreground shadow-border"
                      id="bridge-link"
                      onChange={(event) => setBridgeUrl(event.target.value)}
                      placeholder="http://127.0.0.1:42420"
                      value={bridgeUrl}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="focus-ring rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-40"
                        disabled={connectionState === "connecting"}
                        onClick={() => void connectFromInput()}
                        type="button"
                      >
                        {connectionState === "connecting" ? "Connecting..." : "Reconnect"}
                      </button>
                      <button
                        className="focus-ring rounded-full bg-muted px-4 py-2 text-xs font-medium text-foreground shadow-border"
                        onClick={() => void refreshInventory()}
                        type="button"
                      >
                        Refresh inventory
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-muted p-4 shadow-border">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Runtime</p>
                    <div className="mt-3 flex gap-2">
                      {(["cli", "desktop"] as const).map((target) => (
                        <button
                          className={`focus-ring rounded-full px-4 py-2 text-xs font-medium ${
                            snapshot?.pairing.runtimeTarget === target
                              ? "bg-foreground text-background"
                              : "bg-background text-foreground shadow-border"
                          }`}
                          key={target}
                          onClick={() => void changeRuntime(target)}
                          type="button"
                        >
                          {target}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-muted p-4 shadow-border">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
                    <p className="mt-2 text-sm text-foreground">{selectedThread?.cwd ?? health?.bridgeUrl ?? bridgeUrl}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{selectedThread?.gitInfo?.branch ?? "main"}</p>
                  </div>
                  <div className="mt-4 rounded-2xl bg-muted p-4 shadow-border">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Active config</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl bg-background p-3 shadow-border">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Model</p>
                        <select
                          aria-label="Model"
                          className="focus-ring mt-2 w-full rounded-xl bg-muted px-3 py-2 text-sm text-foreground shadow-border"
                          disabled={isPending || visibleModels.length === 0}
                          onChange={(event) => void writeConfigValue("model", event.target.value)}
                          value={inventory?.config?.model ?? activeModel?.model ?? ""}
                        >
                          {visibleModels.map((model) => (
                            <option key={model.id} value={model.model}>
                              {model.displayName}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-muted-foreground">{inventory?.config?.modelProvider ?? "provider auto"}</p>
                      </div>
                      <div className="rounded-xl bg-background p-3 shadow-border">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Reasoning</p>
                        <select
                          aria-label="Reasoning effort"
                          className="focus-ring mt-2 w-full rounded-xl bg-muted px-3 py-2 text-sm text-foreground shadow-border"
                          disabled={isPending || reasoningOptions.length === 0}
                          onChange={(event) => void writeConfigValue("model_reasoning_effort", event.target.value)}
                          value={inventory?.config?.reasoningEffort ?? reasoningOptions[0] ?? ""}
                        >
                          {reasoningOptions.map((reasoning) => (
                            <option key={reasoning} value={reasoning}>
                              {reasoning}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-muted-foreground">{inventory?.config?.approvalPolicy ?? "approval auto"}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl bg-background p-3 shadow-border">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Approval policy</p>
                        <select
                          aria-label="Approval policy"
                          className="focus-ring mt-2 w-full rounded-xl bg-muted px-3 py-2 text-sm text-foreground shadow-border"
                          disabled={isPending}
                          onChange={(event) => void writeConfigValue("approval_policy", event.target.value)}
                          value={inventory?.config?.approvalPolicy ?? APPROVAL_POLICY_OPTIONS[0]}
                        >
                          {APPROVAL_POLICY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="rounded-xl bg-background p-3 shadow-border">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Sandbox</p>
                        <select
                          aria-label="Sandbox mode"
                          className="focus-ring mt-2 w-full rounded-xl bg-muted px-3 py-2 text-sm text-foreground shadow-border"
                          disabled={isPending}
                          onChange={(event) => void writeConfigValue("sandbox_mode", event.target.value)}
                          value={inventory?.config?.sandboxMode ?? SANDBOX_MODE_OPTIONS[1]}
                        >
                          {SANDBOX_MODE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl bg-background p-3 shadow-border">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Web search</p>
                        <select
                          aria-label="Web search"
                          className="focus-ring mt-2 w-full rounded-xl bg-muted px-3 py-2 text-sm text-foreground shadow-border"
                          disabled={isPending}
                          onChange={(event) => void writeConfigValue("web_search", event.target.value)}
                          value={inventory?.config?.webSearch ?? WEB_SEARCH_OPTIONS[0]}
                        >
                          {WEB_SEARCH_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-foreground">Available models</h3>
                    <div className="mt-2 space-y-2">
                      {visibleModels.length > 0 ? (
                        visibleModels.map((model) => (
                          <article className="rounded-2xl bg-muted p-4 shadow-border" key={model.id}>
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-foreground">{model.displayName}</p>
                              {model.isDefault ? (
                                <span className="rounded-full bg-background px-3 py-1 text-[11px] text-muted-foreground shadow-border">
                                  default
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{model.model}</p>
                            <p className="mt-2 text-sm leading-6 text-foreground">{model.description}</p>
                            <p className="mt-2 text-xs text-muted-foreground">Reasoning: {model.reasoningEfforts.join(", ")}</p>
                          </article>
                        ))
                      ) : (
                        <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground shadow-border">
                          No model metadata was returned by the Codex runtime.
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-foreground">Experimental features</h3>
                    <div className="mt-2 space-y-2">
                      {(inventory?.experimentalFeatures ?? []).length > 0 ? (
                        inventory!.experimentalFeatures!.map((feature) => (
                          <article className="rounded-2xl bg-muted p-4 shadow-border" key={feature.name}>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {feature.displayName ?? feature.name}
                                </p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                  {feature.stage ?? "unknown"}
                                </p>
                              </div>
                              <span className="rounded-full bg-background px-3 py-1 text-[11px] text-muted-foreground shadow-border">
                                {feature.enabled ? "enabled" : feature.defaultEnabled ? "default on" : "off"}
                              </span>
                            </div>
                            {feature.description ? (
                              <p className="mt-2 text-sm leading-6 text-foreground">{feature.description}</p>
                            ) : null}
                            {feature.announcement ? (
                              <p className="mt-2 text-xs leading-5 text-muted-foreground">{feature.announcement}</p>
                            ) : null}
                          </article>
                        ))
                      ) : (
                        <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground shadow-border">
                          No experimental feature metadata was returned by this Codex session.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        <aside className="hidden w-[340px] shrink-0 border-l border-border/60 bg-muted/70 p-4 xl:block">
          <ThreadSummaryCard
            accountEmail={snapshot?.account?.email}
            runtimeTarget={snapshot?.pairing.runtimeTarget}
            thread={selectedThread}
          />
          <div className="mt-5 flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-semibold text-foreground">Permissions</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {pendingApprovals.length > 0
                  ? `${pendingApprovals.length} pending`
                  : activePermissionReviews.length > 0
                    ? `${activePermissionReviews.length} under review`
                    : "No pending permissions"}
              </p>
            </div>
            <Icon name="warning" className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 space-y-3">
            {activePermissionReviews.length > 0
              ? activePermissionReviews.map((review) => <PermissionReviewCard key={review.id} review={review} />)
              : null}
            {pendingApprovals.length > 0 ? (
              pendingApprovals.map((approval) => (
                <ApprovalCard
                  approval={approval}
                  disabled={isPending}
                  key={approval.id}
                  onApprove={() => void answerApproval(approval, true)}
                  onDecline={() => void answerApproval(approval, false)}
                  onValueChange={(value) => setApprovalAnswers((current) => ({ ...current, [approval.id]: value }))}
                  value={approvalAnswers[approval.id] ?? "{}"}
                />
              ))
            ) : activePermissionReviews.length === 0 ? (
              <div className="rounded-2xl bg-background p-5 text-sm text-muted-foreground shadow-card">
                Command, file, connector, and broader permission requests from Codex will appear here. Until then,
                use this rail as a quick view into the active thread state.
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
