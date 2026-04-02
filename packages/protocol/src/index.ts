export type RuntimeTarget = "cli" | "desktop";
export type PairingState = "unpaired" | "paired" | "reconnecting";
export type TurnState = "idle" | "running" | "completed" | "failed";

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

export interface WorkspaceMutationInput {
  threadId: string;
  message: OffdexMessage;
  state?: TurnState;
  updatedAt?: string;
}

export interface OffdexPairingPayload {
  bridgeUrl: string;
  macName: string;
  version: 1;
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
    v: "1",
  });
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

  if (!bridgeUrl || !macName || version !== "1") {
    throw new Error("Invalid Offdex pairing link.");
  }

  return {
    bridgeUrl,
    macName,
    version: 1,
  };
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
