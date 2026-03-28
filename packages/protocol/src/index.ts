export type RuntimeTarget = "cli" | "desktop";
export type PairingState = "unpaired" | "paired" | "reconnecting";
export type TurnState = "idle" | "running" | "completed" | "failed";

export interface DeviceCapabilityMatrix {
  mobile: "expo";
  web: "next";
  runtimes: RuntimeTarget[];
}

export interface OffdexPairingProfile {
  relayUrl: string;
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

export function makeMessage(
  id: string,
  role: OffdexMessage["role"],
  body: string,
  createdAt: string
): OffdexMessage {
  return { id, role, body, createdAt };
}

export function makeDemoWorkspaceSnapshot(
  runtimeTarget: RuntimeTarget = "cli"
): OffdexWorkspaceSnapshot {
  return {
    pairing: {
      relayUrl: "wss://relay.offdex.dev/relay",
      macName: "Dhruv’s machine",
      state: "paired",
      lastSeenAt: "Just now",
      runtimeTarget,
    },
    capabilityMatrix: {
      mobile: "expo",
      web: "next",
      runtimes: runtimeTarget === "desktop" ? ["desktop", "cli"] : ["cli", "desktop"],
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
