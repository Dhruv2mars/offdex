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
  const [isPending, startTransition] = useTransition();
  const socketRef = useRef<WebSocket | null>(null);

  const threads = snapshot?.threads ?? sampleThreads;
  const selectedThread =
    threads.find((thread) => thread.id === selectedThreadId) ?? threads[0] ?? null;
  const messages = selectedThread?.messages ?? [];
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

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8 md:grid-cols-[340px_minmax(0,1fr)] md:px-8">
      <aside className="rounded-lg bg-card p-4 shadow-card">
        <div className="rounded-lg bg-background p-4 shadow-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs font-medium uppercase text-muted-foreground">Machine</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.96px]">
                {health?.macName ?? snapshot?.pairing.macName ?? "Connect your Mac"}
              </h1>
            </div>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              {formatState(connectionState)}
            </span>
          </div>

          <label className="mt-5 block text-xs font-medium text-muted-foreground" htmlFor="machine-link">
            Machine link
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="machine-link"
              value={bridgeUrl}
              onChange={(event) => setBridgeUrl(event.target.value)}
              className="focus-ring min-w-0 flex-1 rounded-md bg-background px-3 py-2.5 font-mono text-xs text-foreground shadow-border"
              placeholder="Paste the QR link or local bridge address"
            />
            <button
              className="focus-ring rounded-md bg-foreground px-4 text-sm font-medium text-background transition hover:bg-[#333333] disabled:opacity-50"
              disabled={connectionState === "connecting"}
              onClick={() => void connectFromInput()}
              type="button"
            >
              Connect
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-card px-3 py-3 shadow-border">
              <p className="text-muted-foreground">Runtime</p>
              <p className="mt-1 font-semibold">{health?.bridgeMode ?? "cli"}</p>
            </div>
            <div className="rounded-md bg-card px-3 py-3 shadow-border">
              <p className="text-muted-foreground">Codex</p>
              <p className="mt-1 font-semibold">{codexReady ? "Ready" : "Sign in"}</p>
            </div>
            <div className="rounded-md bg-card px-3 py-3 shadow-border">
              <p className="text-muted-foreground">Path</p>
              <p className="mt-1 font-semibold">
                {connectionTransport === "relay" ? "Remote" : connectionTransport === "local" ? "Local" : "None"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between px-1">
          <p className="font-mono text-xs font-medium uppercase text-muted-foreground">Threads</p>
          <button
            className="focus-ring rounded-full bg-background px-3 py-1 text-xs text-foreground shadow-border transition hover:bg-muted"
            onClick={startNewThread}
            type="button"
          >
            New
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {threads.map((thread) => (
            <button
              className={`focus-ring w-full rounded-lg px-4 py-3 text-left transition ${
                thread.id === selectedThreadId
                  ? "bg-card shadow-card"
                  : "bg-background shadow-border hover:bg-muted"
              }`}
              key={thread.id}
              onClick={() => setSelectedThreadId(thread.id)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold">{thread.title}</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  {thread.state}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {thread.projectLabel} · {thread.updatedAt}
              </p>
            </button>
          ))}
        </div>

        {error ? (
          <p className="mt-4 rounded-lg bg-[#fff1f0] px-4 py-3 text-sm text-[#b42318] shadow-border">
            {error}
          </p>
        ) : null}
      </aside>

      <section className="flex min-h-[720px] flex-col overflow-hidden rounded-lg bg-card text-foreground shadow-card">
        <div className="flex items-center justify-between px-5 py-4 shadow-border">
          <div>
            <p className="font-mono text-xs font-medium uppercase text-muted-foreground">Live session</p>
            <h2 className="mt-1 max-w-xl truncate text-2xl font-semibold tracking-[-0.96px]">
              {displayThread?.title ?? "No thread selected"}
            </h2>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground shadow-border">
            {isPending ? "Syncing" : displayThread?.runtimeTarget ?? "cli"}
          </span>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
          {messages.length > 0 ? (
            messages.map((message) => (
              <article
                className={`max-w-3xl rounded-lg px-5 py-4 ${
                  message.role === "user"
                    ? "ml-auto bg-foreground text-background"
                    : "bg-background text-foreground shadow-card"
                }`}
                key={message.id}
              >
                <div className="mb-2 flex items-center justify-between gap-4 text-xs">
                  <span className={message.role === "user" ? "text-background/60" : "text-muted-foreground"}>
                    {roleLabel(message.role)}
                  </span>
                  <span className={message.role === "user" ? "text-background/45" : "text-muted-foreground"}>
                    {message.createdAt}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7">{message.body}</p>
              </article>
            ))
          ) : (
            <div className="grid h-full place-items-center">
              <div className="max-w-md text-center">
                <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-lg bg-background text-lg font-semibold shadow-card">
                  O
                </div>
                <h3 className="text-2xl font-semibold tracking-[-0.96px]">Start from the browser.</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  This is the web version of the mobile app. It talks to the same bridge,
                  uses the same Codex session, and updates from the live snapshot stream.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-background p-4 shadow-border">
          {!codexReady && isLive ? (
            <p className="mb-3 rounded-lg bg-[#fff7ed] px-4 py-3 text-sm text-[#9a3412] shadow-border">
              Codex is reachable, but this Mac still needs to be signed in.
            </p>
          ) : null}
          <div className="flex gap-3 rounded-lg bg-card p-2 shadow-card">
            <textarea
              className="min-h-12 flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground"
              disabled={!isLive || !codexReady}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  void sendTurn();
                }
              }}
              placeholder={isLive ? "Ask Codex to edit, explain, test, or plan..." : "Connect to your Mac first"}
              value={draft}
            />
            <button
              className="focus-ring self-end rounded-md bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!draft.trim() || !isLive || !codexReady}
              onClick={() => void sendTurn()}
              type="button"
            >
              Send
            </button>
          </div>
          <p className="mt-2 px-2 text-xs text-muted-foreground">Press Cmd/Ctrl + Enter to send.</p>
        </div>
      </section>
    </section>
  );
}
