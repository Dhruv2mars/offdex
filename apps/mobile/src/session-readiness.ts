import type { PairingState, OffdexMachineRecord } from "@offdex/protocol";
import type { BridgeWorkspaceState } from "./bridge-workspace-controller";

export interface ChatReadinessInput {
  pairingState: PairingState;
  connectionState: BridgeWorkspaceState["connectionState"];
  codexReady: boolean;
  isDraftThread: boolean;
}

export interface ChatReadiness {
  onboarding: {
    eyebrow: string;
    title: string;
    body: string;
  } | null;
  emptyRail: {
    title: string;
    body: string;
  };
  composer: {
    placeholder: string;
    hint: string;
    buttonLabel: string;
  };
  paneStatus: {
    title: string;
    body: string;
  };
}

export interface PairingGuide {
  eyebrow: string;
  title: string;
  body: string;
  primaryAction: "scan" | "nearby" | "macStatus" | "refreshMachines" | "refreshNow";
  primaryLabel: string;
  secondaryAction: "nearby" | "disconnect" | null;
  secondaryLabel: string | null;
}

export interface SessionBanner {
  eyebrow: string;
  title: string;
  body: string;
  accent: "ready" | "attention" | "reconnecting" | "offline";
}

export function getChatReadiness(input: ChatReadinessInput): ChatReadiness {
  const transportReady = input.connectionState === "live";

  if (input.pairingState === "unpaired") {
    return {
      onboarding: {
        eyebrow: "First run",
        title: "Pair your Mac first",
        body: "Open the Pairing tab, use a local bridge address, or scan an Offdex pairing code.",
      },
      emptyRail: {
        title: "No live threads yet",
        body: "Pair your Mac first. Offdex will show real Codex threads here as soon as the bridge is live.",
      },
      composer: {
        placeholder: "Pair your Mac to start sending turns",
        hint: "Connect to your Mac first. Offdex only sends real turns over the local bridge.",
        buttonLabel: "Connect first",
      },
      paneStatus: {
        title: "Connect to your Mac",
        body: "Offdex stays local. Pair the bridge, then your real Codex threads will show up here live.",
      },
    };
  }

  if (input.connectionState === "degraded" || input.pairingState === "reconnecting") {
    return {
      onboarding: {
        eyebrow: "Reconnect",
        title: "Rejoin your Mac",
        body: "This phone is still trusted. Offdex is trying to resume the live bridge session now.",
      },
      emptyRail: {
        title: "Waiting for your Mac",
        body: "The trusted machine is reconnecting. Your threads return as soon as the bridge is back.",
      },
      composer: {
        placeholder: "Waiting for your Mac to reconnect",
        hint: "Your trusted machine is reconnecting. Offdex will resume the live session automatically.",
        buttonLabel: "Reconnecting",
      },
      paneStatus: {
        title: "Transport reconnecting",
        body: "The bridge link dropped for a moment. Offdex is restoring the session automatically.",
      },
    };
  }

  if (transportReady && !input.codexReady) {
    return {
      onboarding: {
        eyebrow: "Codex",
        title: "Sign in to Codex on your Mac",
        body: "The phone is connected to your machine, but Codex on that machine is not signed in yet.",
      },
      emptyRail: {
        title: "Codex needs sign-in",
        body: "Offdex is connected to your Mac. Open Codex there and sign in before you start a live thread.",
      },
      composer: {
        placeholder: "Sign in to Codex on your Mac to send turns",
        hint: "Transport is live. Codex on your Mac still needs a signed-in session.",
        buttonLabel: "Mac sign-in",
      },
      paneStatus: {
        title: "Transport connected",
        body: "Your phone is attached to the Mac. Finish the Codex sign-in on that machine to send turns.",
      },
    };
  }

  return {
    onboarding: null,
    emptyRail: {
      title: "No live threads yet",
      body: "Codex is ready on your Mac. Start a new chat and Offdex will stay on the live thread.",
    },
    composer: {
      placeholder: input.isDraftThread
        ? "Start the first turn for this new chat"
        : "Steer the current run or queue the next turn",
      hint: "Pair once. Stay live. Fall back gracefully.",
      buttonLabel: "Send",
    },
    paneStatus: {
      title: "Codex ready on your Mac",
      body: "Transport is live and the runtime session is ready to accept turns.",
    },
  };
}

export function getPairingGuide(input: {
  pairingState: PairingState;
  connectionState: BridgeWorkspaceState["connectionState"];
  trustedPairing: boolean;
  codexReady: boolean;
  hasManagedSession: boolean;
  machineCount: number;
}): PairingGuide {
  if (input.pairingState === "unpaired") {
    return {
      eyebrow: "First run",
      title: "Pair your first Mac",
      body: "Scan the QR from your Mac once or use the nearby bridge path on the same Wi-Fi.",
      primaryAction: "scan",
      primaryLabel: "Scan QR",
      secondaryAction: "nearby",
      secondaryLabel: "Use nearby bridge",
    };
  }

  if (input.connectionState === "degraded" || input.pairingState === "reconnecting") {
    return {
      eyebrow: "Reconnect",
      title: "Offdex is rejoining your Mac",
      body: "This phone is still trusted. Keep the machine online and Offdex will reconnect automatically.",
      primaryAction: "refreshNow",
      primaryLabel: "Retry now",
      secondaryAction: "disconnect",
      secondaryLabel: "Disconnect phone",
    };
  }

  if (!input.codexReady) {
    return {
      eyebrow: "Codex",
      title: "Finish sign-in on your Mac",
      body: "Transport is ready. Open Codex on the connected machine and complete the ChatGPT sign-in there.",
      primaryAction: "macStatus",
      primaryLabel: "Mac status",
      secondaryAction: input.trustedPairing ? "disconnect" : null,
      secondaryLabel: input.trustedPairing ? "Disconnect phone" : null,
    };
  }

  return {
    eyebrow: input.machineCount > 1 ? "Machines" : "Ready",
    title: "Your phone stays trusted",
    body:
      input.hasManagedSession && input.machineCount > 1
        ? "Use your saved machine list to hop back onto any trusted Mac without scanning again."
        : "This phone stays trusted until you disconnect it. Keep the Mac online and Offdex will reconnect from anywhere.",
    primaryAction: input.hasManagedSession ? "refreshMachines" : "refreshNow",
    primaryLabel: input.hasManagedSession ? "Refresh machines" : "Refresh bridge",
    secondaryAction: "disconnect",
    secondaryLabel: "Disconnect phone",
  };
}

export function getSessionBanner(input: {
  macName: string;
  pairingState: PairingState;
  connectionState: BridgeWorkspaceState["connectionState"];
  connectionTransport: BridgeWorkspaceState["connectionTransport"];
  codexReady: boolean;
  machineCount: number;
  hasManagedSession: boolean;
}): SessionBanner {
  if (input.pairingState === "unpaired") {
    return {
      eyebrow: "No machine",
      title: "Pair your first Mac",
      body: "Scan the QR from your machine once. After that, this phone should come back to the same trusted setup automatically.",
      accent: "offline",
    };
  }

  if (input.connectionState === "degraded" || input.pairingState === "reconnecting") {
    return {
      eyebrow: "Reconnecting",
      title: `Rejoining ${input.macName}`,
      body: "The trust is still there. Offdex is restoring the live session and will fall back gracefully if the direct path is unavailable.",
      accent: "reconnecting",
    };
  }

  if (!input.codexReady) {
    return {
      eyebrow: "Codex sign-in",
      title: `${input.macName} still needs login`,
      body: "Your phone is attached to the machine already. Finish the ChatGPT sign-in on the Mac and the live thread surface will be ready immediately.",
      accent: "attention",
    };
  }

  if (input.connectionTransport === "relay") {
    return {
      eyebrow: "Encrypted relay",
      title: `${input.macName} is reachable anywhere`,
      body: "Traffic is flowing through the managed fallback path. The bridge stays the source of truth and the phone keeps the same live thread view.",
      accent: "ready",
    };
  }

  if (input.connectionTransport === "direct") {
    return {
      eyebrow: "Direct remote",
      title: `${input.macName} is live`,
      body:
        input.hasManagedSession && input.machineCount > 1
          ? "You can hop across trusted machines without pairing again. Offdex will prefer a direct path whenever it can."
          : "The phone is talking straight to your machine right now. Turns and thread state should feel immediate.",
      accent: "ready",
    };
  }

  return {
    eyebrow: "Nearby bridge",
    title: `${input.macName} is ready`,
    body: "You are on the local path, so Offdex can stay especially responsive while still mirroring the real Codex session from your machine.",
    accent: "ready",
  };
}

export function getMachineAvailabilityLabel(input: {
  machine: OffdexMachineRecord;
  selectedMachineId: string | null;
  connectionState: BridgeWorkspaceState["connectionState"];
  codexReady: boolean;
}) {
  const isSelected = input.machine.machineId === input.selectedMachineId;

  if (isSelected && input.connectionState === "degraded") {
    return "reconnecting";
  }

  if (isSelected && input.connectionState === "live" && !input.codexReady) {
    return "sign in on Mac";
  }

  if (isSelected && input.connectionState === "live" && input.codexReady) {
    return "ready";
  }

  return input.machine.online ? "online" : "offline";
}

export function getMachineConnectionAction(input: {
  machine: OffdexMachineRecord;
  selectedMachineId: string | null;
  connectionState: BridgeWorkspaceState["connectionState"];
  codexReady: boolean;
}) {
  const isSelected = input.machine.machineId === input.selectedMachineId;

  if (isSelected && input.connectionState === "live") {
    return {
      label: input.codexReady ? "Current machine" : "Mac sign-in needed",
      disabled: true,
    };
  }

  if (isSelected && input.connectionState === "degraded") {
    return {
      label: "Reconnecting",
      disabled: true,
    };
  }

  if (!input.machine.online) {
    return {
      label: "Offline",
      disabled: true,
    };
  }

  return {
    label: "Use this Mac",
    disabled: false,
  };
}
