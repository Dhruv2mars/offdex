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
    <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-6 md:grid-cols-[minmax(0,1fr)_280px] md:px-8">
      <div className="grid gap-5">
        <section className="rounded-lg bg-card p-5 shadow-card">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <p className="font-mono text-xs font-medium uppercase text-muted-foreground">
                Session cockpit
              </p>
              <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-[-2.4px] md:text-5xl">
                {displayThread?.title ?? "No active thread"}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
                {isLive
                  ? "Live bridge connected. Turns and snapshots stay anchored to the Mac."
                  : "Paste a pairing link or local bridge URL to take control from the browser."}
              </p>
            </div>

            <div className="rounded-lg bg-background p-4 shadow-border">
              <label className="block text-xs font-medium text-muted-foreground" htmlFor="machine-link">
                Machine trust
              </label>
              <input
                id="machine-link"
                value={bridgeUrl}
                onChange={(event) => setBridgeUrl(event.target.value)}
                className="focus-ring mt-2 w-full rounded-md bg-card px-3 py-2.5 font-mono text-xs text-foreground shadow-border"
                placeholder="Paste QR link or bridge address"
              />
              <button
                className="focus-ring mt-3 w-full rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:bg-[#333333] disabled:opacity-50"
                disabled={connectionState === "connecting"}
                onClick={() => void connectFromInput()}
                type="button"
              >
                {connectionState === "connecting" ? "Connecting" : "Connect bridge"}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["State", formatState(connectionState)],
              ["Runtime", health?.bridgeMode ?? "cli"],
              ["Codex", codexReady ? "Ready" : "Sign in"],
              [
                "Path",
                connectionTransport === "relay"
                  ? "Remote"
                  : connectionTransport === "local"
                    ? "Local"
                    : "None",
              ],
            ].map(([label, value]) => (
              <div className="rounded-lg bg-background p-4 shadow-border" key={label}>
                <p className="font-mono text-xs uppercase text-muted-foreground">{label}</p>
                <p className="mt-2 text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>
          {error ? (
            <p className="mt-4 rounded-lg bg-[#fff1f0] px-4 py-3 text-sm text-[#b42318] shadow-border">
              {error}
            </p>
          ) : null}
        </section>

        <section className="grid min-h-[620px] gap-5 md:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-lg bg-card p-3 shadow-card">
            <div className="flex items-center justify-between px-2 py-2">
              <p className="font-mono text-xs font-medium uppercase text-muted-foreground">Turn stack</p>
              <button
                className="focus-ring rounded-md bg-background px-3 py-1.5 text-xs text-foreground shadow-border transition hover:bg-muted"
                onClick={startNewThread}
                type="button"
              >
                New
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {threads.map((thread) => (
                <button
                  className={`focus-ring w-full rounded-lg px-4 py-3 text-left transition ${
                    thread.id === selectedThreadId
                      ? "bg-foreground text-background"
                      : "bg-background text-foreground shadow-border hover:bg-muted"
                  }`}
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  type="button"
                >
                  <p className="truncate text-sm font-semibold">{thread.title}</p>
                  <p
                    className={`mt-2 truncate text-xs ${
                      thread.id === selectedThreadId ? "text-background/60" : "text-muted-foreground"
                    }`}
                  >
                    {thread.projectLabel} · {thread.updatedAt}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex flex-col overflow-hidden rounded-lg bg-card shadow-card">
            <div className="flex items-center justify-between px-5 py-4 shadow-border">
              <p className="font-mono text-xs font-medium uppercase text-muted-foreground">
                Live transcript
              </p>
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground shadow-border">
                {isPending ? "Syncing" : displayThread?.runtimeTarget ?? "cli"}
              </span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-muted/40 px-5 py-5">
              {messages.length > 0 ? (
                messages.map((message) => (
                  <article
                    className={`rounded-lg px-5 py-4 ${
                      message.role === "user"
                        ? "ml-auto max-w-3xl bg-foreground text-background"
                        : "max-w-3xl bg-background text-foreground shadow-card"
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
                    <h3 className="text-2xl font-semibold tracking-[-0.96px]">Start a fresh turn.</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Connect a trusted bridge, then send a turn into the same Codex session used by mobile.
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
                  placeholder={isLive ? "Ask Codex for the next change..." : "Connect to your Mac first"}
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
      </div>

      <aside className="grid content-start gap-3">
        <div className="rounded-lg bg-foreground p-4 text-background">
          <p className="font-mono text-xs uppercase text-background/60">Machine</p>
          <p className="mt-12 text-2xl font-semibold tracking-[-0.96px]">
            {health?.macName ?? snapshot?.pairing.macName ?? "No trusted Mac"}
          </p>
        </div>
        {["Bridge owns truth", "Client sends intent", "Snapshot streams back"].map((item, index) => (
          <div className="rounded-lg bg-card p-4 shadow-card" key={item}>
            <p className="font-mono text-xs text-muted-foreground">0{index + 1}</p>
            <p className="mt-3 text-sm font-semibold">{item}</p>
          </div>
        ))}
      </aside>
    </section>
  );
}
