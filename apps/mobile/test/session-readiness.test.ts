import { describe, expect, test } from "bun:test";
import type { OffdexMachineRecord } from "@offdex/protocol";
import {
  getChatReadiness,
  getMachineAvailabilityLabel,
  getMachineConnectionAction,
  getPairingGuide,
  getSessionBanner,
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

  test("guides first-run users toward pairing their Mac", () => {
    const guide = getPairingGuide({
      pairingState: "unpaired",
      connectionState: "idle",
      trustedPairing: false,
      codexReady: false,
      hasManagedSession: false,
      machineCount: 0,
    });

    expect(guide.title).toBe("Pair your first Mac");
    expect(guide.primaryLabel).toBe("Scan QR");
    expect(guide.secondaryLabel).toBe("Use nearby bridge");
  });

  test("guides trusted users to finish Mac-side Codex sign-in", () => {
    const guide = getPairingGuide({
      pairingState: "paired",
      connectionState: "live",
      trustedPairing: true,
      codexReady: false,
      hasManagedSession: true,
      machineCount: 1,
    });

    expect(guide.title).toBe("Finish sign-in on your Mac");
    expect(guide.primaryLabel).toBe("Mac status");
  });

  test("guides trusted users toward their machine list when everything is ready", () => {
    const guide = getPairingGuide({
      pairingState: "paired",
      connectionState: "live",
      trustedPairing: true,
      codexReady: true,
      hasManagedSession: true,
      machineCount: 2,
    });

    expect(guide.title).toBe("Your phone stays trusted");
    expect(guide.primaryLabel).toBe("Refresh machines");
    expect(guide.secondaryLabel).toBe("Disconnect phone");
  });

  test("uses an offline banner before any machine has been paired", () => {
    const banner = getSessionBanner({
      macName: "studio-macbook",
      pairingState: "unpaired",
      connectionState: "idle",
      connectionTransport: null,
      codexReady: false,
      machineCount: 0,
      hasManagedSession: false,
    });

    expect(banner.eyebrow).toBe("No machine");
    expect(banner.title).toBe("Pair your first Mac");
    expect(banner.accent).toBe("offline");
  });

  test("uses a reconnect banner while a trusted machine is recovering", () => {
    const banner = getSessionBanner({
      macName: "studio-macbook",
      pairingState: "reconnecting",
      connectionState: "degraded",
      connectionTransport: "direct",
      codexReady: true,
      machineCount: 1,
      hasManagedSession: true,
    });

    expect(banner.eyebrow).toBe("Reconnecting");
    expect(banner.title).toContain("studio-macbook");
    expect(banner.accent).toBe("reconnecting");
  });

  test("uses a sign-in banner when transport is up but Codex is not ready", () => {
    const banner = getSessionBanner({
      macName: "studio-macbook",
      pairingState: "paired",
      connectionState: "live",
      connectionTransport: "bridge",
      codexReady: false,
      machineCount: 1,
      hasManagedSession: true,
    });

    expect(banner.eyebrow).toBe("Codex sign-in");
    expect(banner.title).toContain("still needs login");
    expect(banner.accent).toBe("attention");
  });

  test("surfaces the relay fallback when remote traffic is relayed", () => {
    const banner = getSessionBanner({
      macName: "studio-macbook",
      pairingState: "paired",
      connectionState: "live",
      connectionTransport: "relay",
      codexReady: true,
      machineCount: 1,
      hasManagedSession: true,
    });

    expect(banner.eyebrow).toBe("Encrypted relay");
    expect(banner.title).toContain("reachable anywhere");
    expect(banner.accent).toBe("ready");
  });

  test("keeps the current machine card locked to the active session", () => {
    const action = getMachineConnectionAction({
      machine: makeMachine(),
      selectedMachineId: "machine-123",
      connectionState: "live",
      codexReady: true,
    });

    expect(action.label).toBe("Current machine");
    expect(action.disabled).toBe(true);
  });

  test("lets users reconnect an inactive but online trusted machine", () => {
    const action = getMachineConnectionAction({
      machine: makeMachine({ machineId: "machine-456" }),
      selectedMachineId: "machine-123",
      connectionState: "live",
      codexReady: true,
    });

    expect(action.label).toBe("Use this Mac");
    expect(action.disabled).toBe(false);
  });

  test("keeps offline machines non-actionable", () => {
    const action = getMachineConnectionAction({
      machine: makeMachine({ machineId: "machine-456", online: false }),
      selectedMachineId: "machine-123",
      connectionState: "live",
      codexReady: true,
    });

    expect(action.label).toBe("Offline");
    expect(action.disabled).toBe(true);
  });
});
