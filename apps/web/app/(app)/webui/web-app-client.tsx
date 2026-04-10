"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  OFFDEX_NEW_THREAD_ID,
  claimPairing,
  extractPairingUri,
  fetchBridgeHealth,
  fetchBridgeSnapshot,
  liveUrlForConnection,
  normalizeBridgeUrl,
  parseManagedSession,
  readLiveSnapshotMessage,
  resolveManagedConnection,
  sendBridgeTurn,
  serializeManagedSession,
  type BridgeHealth,
  type ConnectionTransport,
  type ManagedSession,
  type OffdexMessage,
  type OffdexThread,
  type OffdexWorkspaceSnapshot,
} from "./web-transport";

type ConnectionState = "idle" | "connecting" | "live" | "offline";
const STORED_BRIDGE_KEY = "offdex:web:bridge";
const STORED_SESSION_KEY = "offdex:web:machine-session";

const sampleThreads: OffdexThread[] = [
  {
    id: "sample-refactor",
    title: "Refactor the bridge reconnect path",
    projectLabel: "offdex",
    runtimeTarget: "cli",
    state: "completed",
    unreadCount: 0,
    updatedAt: "Preview",
    messages: [
      {
        id: "sample-user",
        role: "user",
        body: "Make reconnect feel instant after the Mac wakes up.",
        createdAt: "Preview",
      },
      {
        id: "sample-assistant",
        role: "assistant",
        body: "I will tighten resume, refresh the live snapshot first, and fall back to reconnect only when the socket is stale.",
        createdAt: "Preview",
      },
    ],
  },
];

function roleLabel(role: OffdexMessage["role"]) {
  if (role === "assistant") return "Codex";
  if (role === "user") return "You";
  return "System";
}

type IconName =
  | "chevron"
  | "chevron-down"
  | "collapse"
  | "message"
  | "folder"
  | "settings"
  | "send"
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
  | "arrow-up";

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

  if (name === "collapse") {
    return (
      <svg aria-hidden="true" {...common}>
        <rect height="16" rx="3" width="16" x="4" y="4" />
        <path d="M10 4v16" />
      </svg>
    );
  }

  if (name === "message") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v5a3.5 3.5 0 0 1-3.5 3.5H11l-4.5 4v-4A3.5 3.5 0 0 1 5 11.5z" />
      </svg>
    );
  }

  if (name === "folder") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6A2.5 2.5 0 0 1 20.5 9.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5z" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg aria-hidden="true" {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2.8v3M12 18.2v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.8 12h3M18.2 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
      </svg>
    );
  }

  if (name === "send") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="m5 12 14-7-5 14-2.5-6.5z" />
        <path d="m11.5 12.5 7.5-7.5" />
      </svg>
    );
  }

  if (name === "arrow-up") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    );
  }

  if (name === "plug") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M9 7V3M15 7V3M7 7h10v4a5 5 0 0 1-10 0zM12 16v5" />
      </svg>
    );
  }

  if (name === "plus") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg aria-hidden="true" {...common}>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    );
  }

  if (name === "plugins") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
      </svg>
    );
  }

  if (name === "automations") {
    return (
      <svg aria-hidden="true" {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    );
  }

  if (name === "edit") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    );
  }

  if (name === "cloud") {
    return (
      <svg aria-hidden="true" {...common} strokeWidth="1.5">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        <path d="M10 12.5l-1 1 1 1M14 12.5l1 1-1 1M11 15h2" strokeLinecap="square" />
      </svg>
    );
  }

  if (name === "more") {
    return (
      <svg aria-hidden="true" {...common}>
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="19" cy="12" r="1.5" />
        <circle cx="5" cy="12" r="1.5" />
      </svg>
    );
  }

  if (name === "commit") {
    return (
      <svg aria-hidden="true" {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M3 12h6M15 12h6" />
      </svg>
    );
  }

  if (name === "split") {
    return (
      <svg aria-hidden="true" {...common}>
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M12 3v18" />
      </svg>
    );
  }

  if (name === "mic") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
      </svg>
    );
  }

  if (name === "chevron-down") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="m6 9 6 6 6-6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" {...common}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function WebAppClient() {
  const searchParams = useSearchParams();
  const [bridgeUrl, setBridgeUrl] = useState("");
  const [connectionTarget, setConnectionTarget] = useState("");
  const [connectionTransport, setConnectionTransport] = useState<ConnectionTransport | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [snapshot, setSnapshot] = useState<OffdexWorkspaceSnapshot | null>(null);
  const [health, setHealth] = useState<BridgeHealth | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState(OFFDEX_NEW_THREAD_ID);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const socketRef = useRef<WebSocket | null>(null);

  const threads = snapshot?.threads ?? sampleThreads;
  const selectedThread =
    threads.find((thread) => thread.id === selectedThreadId) ?? null;
  const isLive = connectionState === "live";
  const codexReady = health?.bridgeMode === "demo" || (health?.codexConnected ?? false);

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
      const [nextHealth, nextSnapshot] = await Promise.all([
        fetchBridgeHealth(nextBridgeUrl),
        fetchBridgeSnapshot(nextBridgeUrl),
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
        setSelectedThreadId(OFFDEX_NEW_THREAD_ID);
        setConnectionState("live");
      });

      const socket = new WebSocket(liveUrlForConnection(nextBridgeUrl));
      socketRef.current = socket;
      socket.onmessage = (event) => {
        const nextSnapshot = readLiveSnapshotMessage(nextBridgeUrl, event.data as string);
        if (nextSnapshot) {
          startTransition(() => {
            setSnapshot(nextSnapshot);
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

  async function sendTurn() {
    const body = draft.trim();
    if (!body || !isLive || !codexReady) return;

    setDraft("");
    setError("");

    try {
      const result = await sendBridgeTurn(
        connectionTarget || bridgeUrl,
        selectedThreadId === OFFDEX_NEW_THREAD_ID
          ? OFFDEX_NEW_THREAD_ID
          : selectedThread?.id ?? OFFDEX_NEW_THREAD_ID,
        body
      );
      startTransition(() => {
        setSnapshot(result.snapshot);
        setSelectedThreadId(result.snapshot.threads[0]?.id ?? selectedThreadId);
      });
    } catch (sendError) {
      setDraft(body);
      setError(
        sendError instanceof Error
          ? `Codex did not accept that turn: ${sendError.message}`
          : "Codex did not accept that turn."
      );
    }
  }

  const projectName = "offdex";
  const displayMessages =
    selectedThread?.id === OFFDEX_NEW_THREAD_ID ? [] : selectedThread?.messages ?? [];
  const projectThreadGroups = threads.reduce<Array<{ name: string; threads: OffdexThread[] }>>(
    (groups, thread) => {
      const name = thread.projectLabel || projectName;
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
    <section className="flex h-dvh min-h-0 w-full overflow-hidden bg-background text-foreground font-sans">
      {/* Sidebar - Styled with #fafafa (muted) to match desktop app feel */}
      <aside data-webui-sidebar className="flex h-full w-[260px] shrink-0 flex-col bg-muted shadow-border transition-all z-10 select-none">
        <div className="flex h-[48px] items-center justify-between px-4">
          <span className="font-semibold text-[13px] text-foreground">Offdex</span>
          <button aria-label="Toggle sidebar" className="text-muted-foreground hover:text-foreground">
            <Icon name="collapse" className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex flex-col gap-[2px] px-3 py-1">
          <button
            className="focus-ring flex h-[32px] w-full items-center gap-2.5 rounded-md px-2 text-[13px] font-medium text-foreground transition hover:bg-black/5"
            onClick={() => setSelectedThreadId(OFFDEX_NEW_THREAD_ID)}
            type="button"
          >
            <Icon name="edit" className="h-[15px] w-[15px]" />
            New chat
          </button>
          
          <div className="mt-2 flex flex-col gap-[2px]">
            <button className="focus-ring flex h-[32px] w-full items-center gap-2.5 rounded-md px-2 text-[13px] text-muted-foreground transition hover:bg-black/5 hover:text-foreground">
              <Icon name="search" className="h-[15px] w-[15px]" />
              Search
            </button>
            <button className="focus-ring flex h-[32px] w-full items-center gap-2.5 rounded-md px-2 text-[13px] text-muted-foreground transition hover:bg-black/5 hover:text-foreground">
              <Icon name="plugins" className="h-[15px] w-[15px]" />
              Plugins
            </button>
            <button className="focus-ring flex h-[32px] w-full items-center gap-2.5 rounded-md px-2 text-[13px] text-muted-foreground transition hover:bg-black/5 hover:text-foreground">
              <Icon name="automations" className="h-[15px] w-[15px]" />
              Automations
            </button>
          </div>
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 scrollbar-hide">
          <div className="flex items-center justify-between px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Projects
            <div className="flex gap-1 opacity-50">
              <Icon name="chevron-down" className="h-3 w-3" />
              <Icon name="plugins" className="h-3 w-3" />
            </div>
          </div>
          
          <div className="mt-1 space-y-3">
            {projectThreadGroups.map((group) => (
              <div key={group.name}>
                <div data-webui-project-row className="flex h-7 items-center gap-2 px-2 text-[13px] text-foreground font-medium">
                  <Icon name="folder" className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate">{group.name}</span>
                </div>
                <div data-webui-project-threads className="mt-[2px] flex flex-col gap-[2px]">
                  {/* Threads */}
                  {group.threads.map((thread) => {
                    const isActive = thread.id === selectedThreadId;
                    return (
                      <button
                        className={`focus-ring flex min-h-[32px] w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left text-[13px] transition ${
                          isActive
                            ? "bg-background font-medium text-foreground shadow-border"
                            : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                        }`}
                        key={thread.id}
                        onClick={() => setSelectedThreadId(thread.id)}
                        type="button"
                      >
                        <span className="min-w-0 flex-1 truncate leading-tight">{thread.title}</span>
                        <span className="shrink-0 text-[11px] opacity-50 font-medium">2d</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings Button / Connection Error Popover */}
        <div className="relative p-3">
          {isSettingsOpen && (
            <div className="absolute bottom-[52px] left-3 w-[236px] z-20 rounded-xl bg-background p-4 shadow-card animate-fade-in-delay-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="sidebar-machine-link">
                Bridge Link
              </label>
              <input
                className="focus-ring mt-2 w-full rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground shadow-border"
                id="sidebar-machine-link"
                onChange={(event) => setBridgeUrl(event.target.value)}
                placeholder="http://127.0.0.1:42420"
                value={bridgeUrl}
              />
              <button
                className="focus-ring mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
                disabled={connectionState === "connecting"}
                onClick={() => void connectFromInput()}
                type="button"
              >
                <Icon name="plug" />
                {connectionState === "connecting" ? "Connecting..." : "Connect"}
              </button>
            </div>
          )}
          <button
            className="focus-ring flex h-[32px] w-full items-center gap-2.5 rounded-md px-2 text-[13px] font-medium text-muted-foreground transition hover:bg-black/5 hover:text-foreground"
            onClick={() => setSettingsOpen(!isSettingsOpen)}
            type="button"
          >
            <Icon name="settings" className="h-[15px] w-[15px]" />
            Settings
          </button>
        </div>
      </aside>

      {/* Main Chat Canvas */}
      <div className="flex min-w-0 flex-1 flex-col bg-background relative">
        {/* Top Header */}
        <header className="flex h-[48px] shrink-0 items-center justify-between px-5 select-none bg-background/80 backdrop-blur-sm z-10 absolute top-0 left-0 right-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[13px] font-semibold text-foreground">
              {selectedThread?.id === OFFDEX_NEW_THREAD_ID || !selectedThread ? "New chat" : selectedThread.title}
            </h1>
            <button className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <Icon name="more" className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground font-medium">
            <button className="flex h-7 items-center gap-1.5 rounded-md px-2 transition hover:bg-muted">
              {health?.bridgeMode ?? "cli"} <Icon name="chevron-down" className="h-3 w-3" />
            </button>
            <button className="flex h-7 items-center gap-1.5 rounded-md px-2 transition hover:bg-muted">
              <Icon name="commit" className="h-[14px] w-[14px]" /> Commit <Icon name="chevron-down" className="h-3 w-3" />
            </button>
            <button className="grid h-7 w-7 place-items-center rounded-md transition hover:bg-muted">
              <Icon name="split" className="h-[14px] w-[14px]" />
            </button>
          </div>
        </header>

        {/* Scrollable Thread Area */}
        <section className="h-full w-full overflow-y-auto px-4 pt-[48px] pb-[160px]">
          {displayMessages.length > 0 ? (
            <div className="mx-auto flex w-full max-w-[800px] flex-col gap-6 py-6">
              {displayMessages.map((message) => (
                <article
                  className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  key={message.id}
                >
                  <div
                    className={`max-w-[85%] rounded-[16px] px-4 py-3 text-[15px] leading-relaxed animate-fade-in ${
                      message.role === "user"
                        ? "bg-foreground text-background"
                        : "bg-background text-foreground shadow-border"
                    }`}
                  >
                    <p className="whitespace-pre-wrap font-sans">{message.body}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center pb-[100px] select-none">
              <div className="flex flex-col items-center animate-fade-in">
                <Icon name="cloud" className="h-[42px] w-[42px] text-foreground mb-4 opacity-90" />
                <h2 className="text-[24px] font-semibold tracking-[-0.96px] text-foreground">
                  Let's build
                </h2>
                <div className="mt-1.5 flex items-center gap-1 text-[16px] text-muted-foreground font-medium transition cursor-pointer hover:text-foreground">
                  {projectName} <Icon name="chevron-down" className="h-4 w-4" />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Floating Input Container */}
        <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center px-6 pointer-events-none">
          <div className="w-full max-w-[800px] pointer-events-auto">
            {error && (
              <p className="mb-3 rounded-lg bg-[#fff1f0] px-4 py-2.5 text-sm text-[#b42318] shadow-border animate-fade-in">
                {error}
              </p>
            )}
            
            <div className="flex flex-col rounded-xl bg-background shadow-border shadow-card transition-shadow focus-within:shadow-card-hover overflow-hidden relative">
              {/* Inner ring overlay */}
              <div className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_0_0_1px_#fafafa] z-10" />
              
              <textarea
                className="w-full min-h-[52px] max-h-[400px] resize-none bg-transparent px-4 pt-3.5 pb-0 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground outline-none relative z-20 font-sans"
                disabled={!isLive || !codexReady}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    void sendTurn();
                  }
                }}
                placeholder="Ask Codex anything, @ to add files, / for commands, $ for skills"
                value={draft}
                rows={1}
                style={{ height: draft ? `${Math.min(draft.split('\n').length * 24 + 32, 400)}px` : '52px' }}
              />

              <div className="flex items-center justify-between px-2 pb-2 pt-2 relative z-20">
                <div className="flex items-center gap-1">
                  <button className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    <Icon name="plus" className="h-4 w-4" />
                  </button>
                  <button className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    GPT-5.4 <Icon name="chevron-down" className="h-3 w-3 opacity-60" />
                  </button>
                  <button className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    High <Icon name="chevron-down" className="h-3 w-3 opacity-60" />
                  </button>
                </div>
                
                <div className="flex items-center gap-1.5 pr-1">
                  <button className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    <Icon name="mic" className="h-[15px] w-[15px]" />
                  </button>
                  <button
                    aria-label="Send message"
                    className="focus-ring grid h-[28px] w-[28px] place-items-center rounded-full bg-foreground text-background transition hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={!draft.trim() || !isLive || !codexReady}
                    onClick={() => void sendTurn()}
                    type="button"
                  >
                    <Icon name="arrow-up" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Status Bar (Cosmetic Tech Labels matching desktop) */}
            <div className="mt-3 flex items-center justify-between px-1 font-mono text-[11px] text-muted-foreground tracking-tight select-none">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition opacity-70 hover:opacity-100">
                  <Icon name="more" className="h-3 w-3" />
                  Local <Icon name="chevron-down" className="h-3 w-3" />
                </div>
                <div className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition opacity-70 hover:opacity-100">
                  <Icon name="settings" className="h-3 w-3" />
                  Custom (config.toml) <Icon name="chevron-down" className="h-3 w-3" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition opacity-70 hover:opacity-100">
                <Icon name="split" className="h-3 w-3" />
                main <Icon name="chevron-down" className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
