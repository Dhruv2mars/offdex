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
