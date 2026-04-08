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

function formatState(state: ConnectionState) {
  if (state === "live") return "Live";
  if (state === "connecting") return "Connecting";
  if (state === "offline") return "Offline";
  return "Not paired";
}

function roleLabel(role: OffdexMessage["role"]) {
  if (role === "assistant") return "Codex";
  if (role === "user") return "You";
  return "System";
}

type IconName =
  | "chevron"
  | "collapse"
  | "message"
  | "folder"
  | "settings"
  | "send"
  | "plug"
  | "plus";

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
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const socketRef = useRef<WebSocket | null>(null);

  const threads = snapshot?.threads ?? sampleThreads;
  const selectedThread =
    threads.find((thread) => thread.id === selectedThreadId) ?? threads[0] ?? null;
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
    // Run once on page open; reconnect is user-driven after that.
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
        setSelectedThreadId(nextSnapshot.threads[0]?.id ?? "");
        setConnectionState("live");
      });

      const socket = new WebSocket(liveUrlForConnection(nextBridgeUrl));
      socketRef.current = socket;
      socket.onmessage = (event) => {
        const nextSnapshot = readLiveSnapshotMessage(nextBridgeUrl, event.data as string);
        if (nextSnapshot) {
          startTransition(() => {
            setSnapshot(nextSnapshot);
            setSelectedThreadId((current) => current || nextSnapshot.threads[0]?.id || "");
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

  async function startNewThread() {
    setSelectedThreadId(OFFDEX_NEW_THREAD_ID);
  }

  const displayThread =
    selectedThreadId === OFFDEX_NEW_THREAD_ID
      ? {
          id: OFFDEX_NEW_THREAD_ID,
          title: "New chat",
          projectLabel: snapshot?.pairing.macName ?? "Offdex",
          runtimeTarget: "cli" as const,
          state: "idle" as const,
          unreadCount: 0,
          updatedAt: "Ready",
          messages: [],
        }
      : selectedThread;
  const displayMessages =
    displayThread?.id === OFFDEX_NEW_THREAD_ID ? [] : displayThread?.messages ?? [];
  const projectName = "Offdex";
  const machineName = health?.macName ?? snapshot?.pairing.macName ?? "No trusted Mac";
  const transportPath =
    connectionTransport === "relay"
      ? "Remote"
      : connectionTransport === "local"
        ? "Local"
        : "None";

  return (
    <section className="flex h-dvh min-h-0 bg-background text-foreground">
      <aside
        className={`flex h-dvh shrink-0 flex-col bg-muted text-foreground shadow-border transition-[width] duration-200 ${
          isSidebarOpen ? "w-[280px]" : "w-[68px]"
        }`}
        data-webui-sidebar
      >
        <div className="flex h-14 items-center gap-2 px-3">
          <button
            aria-label="Toggle sidebar"
            className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-card hover:text-foreground"
            onClick={() => setSidebarOpen((current) => !current)}
            type="button"
          >
            <Icon name="collapse" />
          </button>
          {isSidebarOpen ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{projectName}</p>
              <p className="truncate text-xs text-muted-foreground">{formatState(connectionState)}</p>
            </div>
          ) : null}
        </div>

        <nav className="px-2 py-2">
          <button
            className="focus-ring flex h-10 w-full items-center gap-3 rounded-md px-2 text-sm font-medium transition hover:bg-card"
            onClick={() => void startNewThread()}
            title="New chat"
            type="button"
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center">
              <Icon name="message" />
            </span>
            {isSidebarOpen ? <span>New chat</span> : null}
          </button>

          <div className="mt-1 flex h-10 w-full items-center gap-3 rounded-md px-2 text-sm font-medium text-muted-foreground">
            <span className="grid h-6 w-6 shrink-0 place-items-center">
              <Icon name="folder" />
            </span>
            {isSidebarOpen ? <span>Projects</span> : null}
          </div>
          {isSidebarOpen ? (
            <div className="ml-8 mt-1 rounded-md bg-card px-2 py-1.5 text-sm font-medium shadow-border">
              {projectName}
            </div>
          ) : null}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {isSidebarOpen ? (
            <>
              <div className="px-2 pb-2 pt-3 text-xs font-medium text-muted-foreground">
                Threads
              </div>
              <div className="space-y-1">
                {threads.map((thread) => {
                  const isActive =
                    thread.id === displayThread?.id && displayThread?.id !== OFFDEX_NEW_THREAD_ID;

                  return (
                    <button
                      className={`focus-ring flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition ${
                        isActive
                          ? "bg-card font-medium text-foreground shadow-border"
                          : "text-foreground hover:bg-card"
                      }`}
                      key={thread.id}
                      onClick={() => setSelectedThreadId(thread.id)}
                      type="button"
                    >
                      <span className="min-w-0 flex-1 truncate">{thread.title}</span>
                      {thread.unreadCount > 0 ? (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-[11px] font-medium text-background">
                          {thread.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-1">
              {threads.slice(0, 6).map((thread) => (
                <button
                  aria-label={thread.title}
                  className={`focus-ring grid h-10 w-full place-items-center rounded-md transition ${
                    thread.id === displayThread?.id ? "bg-card shadow-border" : "hover:bg-card"
                  }`}
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  title={thread.title}
                  type="button"
                >
                  <Icon name="message" className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative border-t border-border/80 p-2">
          {isSettingsOpen && isSidebarOpen ? (
            <div className="absolute bottom-16 left-2 right-2 z-20 rounded-lg bg-card p-3 shadow-card">
              <div className="flex items-center gap-3 px-1 pb-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-xs font-semibold text-background">
                  O
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{machineName}</p>
                  <p className="truncate text-xs text-muted-foreground">{health?.bridgeMode ?? "cli"}</p>
                </div>
              </div>
              <label className="block text-xs font-medium text-muted-foreground" htmlFor="sidebar-machine-link">
                Bridge or pairing link
              </label>
              <input
                className="focus-ring mt-2 w-full rounded-md bg-background px-3 py-2 font-mono text-xs text-foreground shadow-border"
                id="sidebar-machine-link"
                onChange={(event) => setBridgeUrl(event.target.value)}
                placeholder="http://127.0.0.1:42420"
                value={bridgeUrl}
              />
              <button
                className="focus-ring mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background transition hover:bg-[#333333] disabled:opacity-50"
                disabled={connectionState === "connecting"}
                onClick={() => void connectFromInput()}
                type="button"
              >
                <Icon name="plug" />
                {connectionState === "connecting" ? "Connecting" : "Connect"}
              </button>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-background p-2 shadow-border">
                  <p className="text-muted-foreground">Codex</p>
                  <p className="mt-1 font-medium">{codexReady ? "Ready" : "Sign in"}</p>
                </div>
                <div className="rounded-md bg-background p-2 shadow-border">
                  <p className="text-muted-foreground">Path</p>
                  <p className="mt-1 font-medium">{transportPath}</p>
                </div>
              </div>
            </div>
          ) : null}

          <button
            className="focus-ring flex h-11 w-full items-center gap-3 rounded-md px-2 text-left transition hover:bg-card"
            onClick={() => setSettingsOpen((current) => !current)}
            title="Settings"
            type="button"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-background shadow-border">
              <Icon name="settings" className="h-4 w-4" />
            </span>
            {isSidebarOpen ? (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">Settings</span>
                <span className="block truncate text-xs text-muted-foreground">{machineName}</span>
              </span>
            ) : null}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {!isSidebarOpen ? (
              <button
                aria-label="Toggle sidebar"
                className="focus-ring grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                onClick={() => setSidebarOpen(true)}
                type="button"
              >
                <Icon name="collapse" />
              </button>
            ) : null}
            <h1 className="truncate text-sm font-semibold">{displayThread?.title ?? projectName}</h1>
            <span className="hidden rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground shadow-border md:inline">
              {isPending ? "Syncing" : formatState(connectionState)}
            </span>
          </div>
          <button
            className="focus-ring hidden rounded-md bg-background px-3 py-1.5 text-xs font-medium shadow-border transition hover:bg-muted md:inline-flex"
            onClick={() => {
              setSidebarOpen(true);
              setSettingsOpen((current) => !current);
            }}
            type="button"
          >
            {codexReady ? "Codex ready" : "Sign in on Mac"}
          </button>
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-6">
          {displayMessages.length > 0 ? (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 py-8">
              {displayMessages.map((message) => (
                <article className="grid gap-2" key={message.id}>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{roleLabel(message.role)}</span>
                    <span>{message.createdAt}</span>
                  </div>
                  <div
                    className={`w-fit max-w-full rounded-lg px-4 py-3 text-sm leading-7 ${
                      message.role === "user"
                        ? "ml-auto bg-foreground text-background"
                        : "bg-card text-foreground shadow-card"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.body}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid h-full place-items-center pb-24">
              <div className="w-full max-w-3xl text-center">
                <h2 className="text-3xl font-semibold tracking-[-1.28px]">
                  What do you want Codex to do?
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                  Start a new thread from the prompt box, or pick an existing thread from the sidebar.
                </p>
              </div>
            </div>
          )}
        </section>

        <div className="shrink-0 bg-background px-4 pb-4 md:px-6 md:pb-6">
          <div className="mx-auto w-full max-w-3xl">
            {!codexReady && isLive ? (
              <p className="mb-3 rounded-lg bg-[#fff7ed] px-4 py-3 text-sm text-[#9a3412] shadow-border">
                Codex is reachable, but this Mac still needs to be signed in.
              </p>
            ) : null}
            {error ? (
              <p className="mb-3 rounded-lg bg-[#fff1f0] px-4 py-3 text-sm text-[#b42318] shadow-border">
                {error}
              </p>
            ) : null}
            <div className="rounded-lg bg-card p-3 shadow-card">
              <textarea
                className="min-h-20 w-full resize-none bg-transparent px-1 text-sm leading-6 outline-none placeholder:text-muted-foreground"
                disabled={!isLive || !codexReady}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    void sendTurn();
                  }
                }}
                placeholder={isLive ? "Ask Codex for the next change..." : "Connect to your Mac from Settings first"}
                value={draft}
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <span>{health?.bridgeMode ?? "cli"}</span>
                  <span>·</span>
                  <span>{transportPath}</span>
                </div>
                <button
                  aria-label="Send message"
                  className="focus-ring grid h-9 w-9 place-items-center rounded-md bg-foreground text-background transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!draft.trim() || !isLive || !codexReady}
                  onClick={() => void sendTurn()}
                  type="button"
                >
                  <Icon name="send" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
