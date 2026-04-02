import { describe, expect, test } from "bun:test";
import type { OffdexMachineRecord } from "@offdex/protocol";
import {
  getChatReadiness,
  getMachineAvailabilityLabel,
} from "../src/session-readiness";

function makeMachine(overrides?: Partial<OffdexMachineRecord>): OffdexMachineRecord {
  return {
    machineId: "machine-123",
    macName: "studio-macbook",
    ownerId: "owner-123",
    ownerLabel: "dhruv@example.com",
    runtimeTarget: "cli",
    lastSeenAt: "Just now",
    online: true,
    directBridgeUrls: ["http://192.168.1.8:42420"],
    localBridgeUrl: "http://192.168.1.8:42420",
    capabilityMatrix: {
      mobile: "expo",
      web: "next",
      runtimes: ["cli"],
    },
    remoteCapability: {
      controlPlaneUrl: "https://control.offdex.app",
      machineId: "machine-123",
      directBridgeUrls: ["http://192.168.1.8:42420"],
      relayUrl: "https://control.offdex.app",
      relayRoomId: "room-123",
    },
    ...overrides,
  };
}

describe("session readiness", () => {
  test("guides the user to sign in on the Mac when transport is live but Codex is not ready", () => {
    const readiness = getChatReadiness({
      pairingState: "paired",
      connectionState: "live",
      codexReady: false,
      isDraftThread: false,
    });

    expect(readiness.onboarding?.title).toBe("Sign in to Codex on your Mac");
    expect(readiness.emptyRail.title).toBe("Codex needs sign-in");
    expect(readiness.composer.placeholder).toBe("Sign in to Codex on your Mac to send turns");
    expect(readiness.composer.buttonLabel).toBe("Mac sign-in");
  });

  test("keeps reconnect wording honest while the trusted machine is recovering", () => {
    const readiness = getChatReadiness({
      pairingState: "reconnecting",
      connectionState: "degraded",
      codexReady: true,
      isDraftThread: false,
    });

    expect(readiness.onboarding?.title).toBe("Rejoin your Mac");
    expect(readiness.composer.hint).toContain("reconnecting");
    expect(readiness.composer.buttonLabel).toBe("Reconnecting");
  });

  test("marks the selected machine as needing a Mac sign-in when transport is live but Codex is not", () => {
    const label = getMachineAvailabilityLabel({
      machine: makeMachine(),
      selectedMachineId: "machine-123",
      connectionState: "live",
      codexReady: false,
    });

    expect(label).toBe("sign in on Mac");
  });

  test("keeps offline machines visibly offline", () => {
    const label = getMachineAvailabilityLabel({
      machine: makeMachine({ machineId: "machine-456", online: false }),
      selectedMachineId: "machine-123",
      connectionState: "idle",
      codexReady: false,
    });

    expect(label).toBe("offline");
  });

  test("marks the active machine as ready once transport and Codex are both live", () => {
    const label = getMachineAvailabilityLabel({
      machine: makeMachine(),
      selectedMachineId: "machine-123",
      connectionState: "live",
      codexReady: true,
    });

    expect(label).toBe("ready");
  });
});
