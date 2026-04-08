"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  OFFDEX_NEW_THREAD_ID,
  type OffdexMessage,
  type OffdexRuntimeAccount,
  type OffdexThread,
  type OffdexWorkspaceSnapshot,
} from "@offdex/protocol";

type ConnectionState = "idle" | "connecting" | "live" | "offline";

type BridgeHealth = {
  ok?: boolean;
  macName?: string;
  bridgeMode?: string;
  codexConnected?: boolean;
  codexAccount?: OffdexRuntimeAccount | null;
  liveClientCount?: number;
  relayConnected?: boolean;
};

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

function normalizeBridgeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
}

function liveUrlForBridge(baseUrl: string) {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/live";
  url.search = "";
  return url.toString();
}

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
    const fromStorage =
      typeof window !== "undefined"
        ? normalizeBridgeUrl(window.localStorage.getItem("offdex:web:bridge") ?? "")
        : "";
    const nextBridge = fromUrl || fromStorage || "http://127.0.0.1:42420";
    setBridgeUrl(nextBridge);
    if (fromUrl) {
      void connect(fromUrl);
    }
    return () => socketRef.current?.close();
    // Run once on page open; reconnect is user-driven after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchJson<T>(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim());
    }
    return response.json() as Promise<T>;
  }

  async function connect(target = bridgeUrl) {
    const nextBridgeUrl = normalizeBridgeUrl(target);
    if (!nextBridgeUrl) return;

    setError("");
    setConnectionState("connecting");
    socketRef.current?.close();

    try {
      const [nextHealth, nextSnapshot] = await Promise.all([
        fetchJson<BridgeHealth>(`${nextBridgeUrl}/health`),
        fetchJson<OffdexWorkspaceSnapshot>(`${nextBridgeUrl}/snapshot`),
      ]);

      window.localStorage.setItem("offdex:web:bridge", nextBridgeUrl);
      startTransition(() => {
        setBridgeUrl(nextBridgeUrl);
        setHealth(nextHealth);
        setSnapshot(nextSnapshot);
        setSelectedThreadId(nextSnapshot.threads[0]?.id ?? "");
        setConnectionState("live");
      });

      const socket = new WebSocket(liveUrlForBridge(nextBridgeUrl));
      socketRef.current = socket;
      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data as string) as {
          type?: string;
          data?: OffdexWorkspaceSnapshot;
        };
        if (payload.type === "workspace.snapshot" && payload.data) {
          startTransition(() => {
            setSnapshot(payload.data ?? null);
            setSelectedThreadId((current) => current || payload.data?.threads[0]?.id || "");
          });
        }
      };
      socket.onclose = () => {
        setConnectionState((current) => current === "live" ? "offline" : current);
      };
    } catch (connectError) {
      setConnectionState("offline");
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
      const result = await fetchJson<{ snapshot: OffdexWorkspaceSnapshot }>(
        `${bridgeUrl}/turn`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            threadId:
              selectedThreadId === OFFDEX_NEW_THREAD_ID
                ? OFFDEX_NEW_THREAD_ID
                : selectedThread?.id ?? OFFDEX_NEW_THREAD_ID,
            body,
          }),
        }
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
    <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 pb-8 md:grid-cols-[340px_minmax(0,1fr)] md:px-8">
      <aside className="rounded-[2rem] border border-white/10 bg-graphite/75 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Machine</p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight">
                {health?.macName ?? snapshot?.pairing.macName ?? "Connect your Mac"}
              </h1>
            </div>
            <span className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs text-brand">
              {formatState(connectionState)}
            </span>
          </div>

          <label className="mt-5 block text-xs font-medium text-muted-foreground" htmlFor="bridge-url">
            Bridge URL
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="bridge-url"
              value={bridgeUrl}
              onChange={(event) => setBridgeUrl(event.target.value)}
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/35 px-3 py-2.5 font-mono text-xs text-foreground outline-none transition focus:border-brand/60"
              placeholder="http://127.0.0.1:42420"
            />
            <button
              className="rounded-2xl bg-brand px-4 text-sm font-semibold text-black transition hover:bg-brand-soft disabled:opacity-50"
              disabled={connectionState === "connecting"}
              onClick={() => void connect()}
              type="button"
            >
              Connect
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
              <p className="text-muted-foreground">Runtime</p>
              <p className="mt-1 font-semibold">{health?.bridgeMode ?? "cli"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
              <p className="text-muted-foreground">Codex</p>
              <p className="mt-1 font-semibold">{codexReady ? "Ready" : "Sign in"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
              <p className="text-muted-foreground">Clients</p>
              <p className="mt-1 font-semibold">{health?.liveClientCount ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between px-1">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Threads</p>
          <button
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-foreground transition hover:border-brand/50"
            onClick={startNewThread}
            type="button"
          >
            New
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {threads.map((thread) => (
            <button
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                thread.id === selectedThreadId
                  ? "border-brand/50 bg-brand/10"
                  : "border-white/10 bg-white/[0.035] hover:border-white/20"
              }`}
              key={thread.id}
              onClick={() => setSelectedThreadId(thread.id)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold">{thread.title}</p>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-muted-foreground">
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
          <p className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </p>
        ) : null}
      </aside>

      <section className="flex min-h-[720px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#f7f8f5] text-[#111412] shadow-2xl shadow-black/35">
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#6c746f]">Live session</p>
            <h2 className="mt-1 max-w-xl truncate text-xl font-semibold tracking-tight">
              {displayThread?.title ?? "No thread selected"}
            </h2>
          </div>
          <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-[#59615d]">
            {isPending ? "Syncing" : displayThread?.runtimeTarget ?? "cli"}
          </span>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
          {messages.length > 0 ? (
            messages.map((message) => (
              <article
                className={`max-w-3xl rounded-[1.5rem] border px-5 py-4 ${
                  message.role === "user"
                    ? "ml-auto border-black/10 bg-[#111412] text-white"
                    : "border-black/10 bg-white text-[#111412] shadow-sm"
                }`}
                key={message.id}
              >
                <div className="mb-2 flex items-center justify-between gap-4 text-xs">
                  <span className={message.role === "user" ? "text-white/60" : "text-[#68716b]"}>
                    {roleLabel(message.role)}
                  </span>
                  <span className={message.role === "user" ? "text-white/45" : "text-[#8a928d]"}>
                    {message.createdAt}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7">{message.body}</p>
              </article>
            ))
          ) : (
            <div className="grid h-full place-items-center">
              <div className="max-w-md text-center">
                <div className="mx-auto mb-5 h-14 w-14 rounded-2xl border border-black/10 bg-white shadow-sm" />
                <h3 className="text-2xl font-semibold tracking-tight">Start from the browser.</h3>
                <p className="mt-3 text-sm leading-6 text-[#68716b]">
                  This is the web version of the mobile app. It talks to the same bridge,
                  uses the same Codex session, and updates from the live snapshot stream.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-black/10 bg-white/80 p-4">
          {!codexReady && isLive ? (
            <p className="mb-3 rounded-2xl border border-amber-400/40 bg-amber-100 px-4 py-3 text-sm text-amber-950">
              Codex is reachable, but this Mac still needs to be signed in.
            </p>
          ) : null}
          <div className="flex gap-3 rounded-[1.5rem] border border-black/10 bg-white p-2 shadow-sm">
            <textarea
              className="min-h-12 flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-6 outline-none placeholder:text-[#8a928d]"
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
              className="self-end rounded-2xl bg-[#111412] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#242a26] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!draft.trim() || !isLive || !codexReady}
              onClick={() => void sendTurn()}
              type="button"
            >
              Send
            </button>
          </div>
          <p className="mt-2 px-2 text-xs text-[#8a928d]">Press Cmd/Ctrl + Enter to send.</p>
        </div>
      </section>
    </section>
  );
}
