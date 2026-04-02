import {
  decodePairingUri,
  type OffdexMachineRecord,
  type OffdexPairingPayload,
  type OffdexWorkspaceSnapshot,
  type RuntimeTarget,
} from "@offdex/protocol";
import {
  claimManagedPairing,
  decodeDirectConnectionTarget,
  decodeRelayConnectionTarget,
  encodeRelayConnectionTarget,
  fetchBridgeHealth,
  fetchBridgeSnapshot,
  interruptBridgeTurn,
  listManagedMachines,
  normalizeBridgeBaseUrl,
  resolveManagedConnection,
  sendBridgeTurn,
  selectBridgeRuntime,
  subscribeToBridgeSnapshots,
  type BridgeHealth,
  type ManagedBridgeSession,
} from "./bridge-client";
import { DemoWorkspaceController } from "./demo-workspace-controller";

export interface BridgePreferencesStore {
  getBridgeBaseUrl(): Promise<string | null>;
  setBridgeBaseUrl(value: string): Promise<void>;
  getPairingUri?(): Promise<string | null>;
  setPairingUri?(value: string | null): Promise<void>;
  getManagedSession?(): Promise<ManagedBridgeSession | null>;
  setManagedSession?(value: ManagedBridgeSession | null): Promise<void>;
  clearPairing?(): Promise<void>;
}

export interface BridgeClient {
  fetchBridgeHealth(baseUrl: string): Promise<BridgeHealth>;
  fetchBridgeSnapshot(baseUrl: string): Promise<OffdexWorkspaceSnapshot>;
  selectBridgeRuntime(
    baseUrl: string,
    preferredTarget: RuntimeTarget
  ): Promise<{ snapshot: OffdexWorkspaceSnapshot }>;
  sendBridgeTurn(
    baseUrl: string,
    threadId: string,
    body: string
  ): Promise<{ snapshot: OffdexWorkspaceSnapshot }>;
  interruptBridgeTurn(
    baseUrl: string,
    threadId: string
  ): Promise<{ snapshot: OffdexWorkspaceSnapshot }>;
  subscribeToBridgeSnapshots(
    baseUrl: string,
    handlers: {
      onSnapshot: (snapshot: OffdexWorkspaceSnapshot) => void;
      onStatusChange?: (status: "open" | "closed" | "error") => void;
    }
  ): () => void;
  claimManagedPairing(
    remote: NonNullable<OffdexPairingPayload["remote"]>
  ): Promise<{ session: ManagedBridgeSession; machines: OffdexMachineRecord[] }>;
  listManagedMachines(
    session: ManagedBridgeSession
  ): Promise<{ machines: OffdexMachineRecord[] }>;
  resolveManagedConnection(
    session: ManagedBridgeSession,
    machineId: string
  ): Promise<{
    machine: OffdexMachineRecord | null;
    connectionTarget: string;
    connectionLabel: string;
    connectionTransport: "direct" | "relay";
  }>;
}

export interface BridgeTimerDriver {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(timerId: unknown): void;
}

export interface BridgeWorkspaceState {
  snapshot: OffdexWorkspaceSnapshot;
  runtimeTarget: RuntimeTarget;
  bridgeBaseUrl: string;
  connectedBridgeUrl: string | null;
  connectionTransport: "bridge" | "direct" | "relay" | null;
  connectionState: "idle" | "connecting" | "live" | "degraded";
  bridgeStatus: string;
  relayUrl: string | null;
  trustedPairing: boolean;
  isBusy: boolean;
  machines: OffdexMachineRecord[];
  managedSession: ManagedBridgeSession | null;
}

const defaultClient: BridgeClient = {
  fetchBridgeHealth,
  fetchBridgeSnapshot,
  selectBridgeRuntime,
  sendBridgeTurn,
  interruptBridgeTurn,
  subscribeToBridgeSnapshots,
  claimManagedPairing,
  listManagedMachines,
  resolveManagedConnection,
};

const defaultTimerDriver: BridgeTimerDriver = {
  setTimeout(callback, delayMs) {
    return globalThis.setTimeout(callback, delayMs);
  },
  clearTimeout(timerId) {
    globalThis.clearTimeout(timerId as ReturnType<typeof setTimeout>);
  },
};

function getConnectionTransport(connectionTarget: string): BridgeWorkspaceState["connectionTransport"] {
  if (decodeRelayConnectionTarget(connectionTarget)) {
    return "relay";
  }

  if (decodeDirectConnectionTarget(connectionTarget)) {
    return "direct";
  }

  return "bridge";
}

export class BridgeWorkspaceController {
  #listeners = new Set<(state: BridgeWorkspaceState) => void>();
  #demoController: DemoWorkspaceController;
  #preferences: BridgePreferencesStore;
  #client: BridgeClient;
  #timer: BridgeTimerDriver;
  #unsubscribeLive: (() => void) | null = null;
  #liveSubscriptionVersion = 0;
  #reconnectTimer: unknown = null;
  #reconnectAttempt = 0;
  #connectionTarget: string | null = null;
  #savedPairingUri: string | null = null;
  #managedSession: ManagedBridgeSession | null = null;
  #state: BridgeWorkspaceState;

  constructor(options?: {
    preferences?: BridgePreferencesStore;
    client?: BridgeClient;
    demoController?: DemoWorkspaceController;
    timer?: BridgeTimerDriver;
  }) {
    this.#preferences = options?.preferences ?? {
      async getBridgeBaseUrl() {
        return null;
      },
      async setBridgeBaseUrl() {},
      async getPairingUri() {
        return null;
      },
      async setPairingUri() {},
      async getManagedSession() {
        return null;
      },
      async setManagedSession() {},
      async clearPairing() {},
    };
    this.#client = options?.client ?? defaultClient;
    this.#timer = options?.timer ?? defaultTimerDriver;
    this.#demoController = options?.demoController ?? new DemoWorkspaceController();
    const snapshot = this.#demoController.getSnapshot();
    this.#state = {
      snapshot,
      runtimeTarget: snapshot.pairing.runtimeTarget,
      bridgeBaseUrl: "http://127.0.0.1:42420",
      connectedBridgeUrl: null,
      connectionTransport: null,
      connectionState: "idle",
      bridgeStatus: "Not connected",
      relayUrl: null,
      trustedPairing: false,
      isBusy: false,
      machines: [],
      managedSession: null,
    };
    this.#demoController.subscribe((snapshotUpdate) => {
      this.#setState({
        snapshot: snapshotUpdate,
        runtimeTarget: snapshotUpdate.pairing.runtimeTarget,
      });
    });
  }

  getState() {
    return structuredClone(this.#state);
  }

  subscribe(listener: (state: BridgeWorkspaceState) => void) {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  async hydrate() {
    const savedManagedSession = (await this.#preferences.getManagedSession?.()) ?? null;
    if (savedManagedSession) {
      this.#managedSession = savedManagedSession;
      this.#setState({
        managedSession: savedManagedSession,
      });
      const managedMachines = await this.#client.listManagedMachines(savedManagedSession);
      this.#setState({
        machines: managedMachines.machines,
      });
      await this.#connectManagedSession(savedManagedSession, savedManagedSession.machineId);
      return this.getState();
    }

    const savedPairingUri = (await this.#preferences.getPairingUri?.()) ?? null;
    if (savedPairingUri) {
      this.#savedPairingUri = savedPairingUri;
      await this.connectFromPairingUri(savedPairingUri, { persistPairingUri: false });
      return this.getState();
    }

    const savedBridgeUrl = await this.#preferences.getBridgeBaseUrl();
    if (!savedBridgeUrl) {
      return this.getState();
    }

    const normalized = normalizeBridgeBaseUrl(savedBridgeUrl);
    this.#setState({ bridgeBaseUrl: normalized });
    await this.connect(normalized);
    return this.getState();
  }

  setBridgeBaseUrl(value: string) {
    this.#savedPairingUri = null;
    this.#setState({ bridgeBaseUrl: value });
  }

  async connectFromPairingUri(
    uri: string,
    options?: { persistPairingUri?: boolean }
  ) {
    const payload = decodePairingUri(uri);
    this.#patchPairingProfile({
      bridgeUrl: payload.bridgeUrl,
      macName: payload.macName,
    });
    if (payload.remote) {
      const managedClaim = await this.#client.claimManagedPairing(payload.remote);
      this.#managedSession = {
        ...managedClaim.session,
        machineId: payload.remote.machineId,
      };
      this.#savedPairingUri = null;
      this.#setState({
        managedSession: this.#managedSession,
        machines: managedClaim.machines,
      });
      await this.#preferences.setManagedSession?.(this.#managedSession);
      await this.#preferences.setPairingUri?.(null);
      return this.#connectManagedSession(this.#managedSession, payload.remote.machineId);
    }

    this.#savedPairingUri = uri;
    this.#patchPairingProfile({
      bridgeUrl: payload.bridgeUrl,
      macName: payload.macName,
    });
    return this.connect(payload.bridgeUrl, {
      pairingPayload: payload,
      persistPairingUri: options?.persistPairingUri ?? true,
    });
  }

  async connect(
    bridgeBaseUrl = this.#state.bridgeBaseUrl,
    options?: {
      pairingPayload?: OffdexPairingPayload;
      persistPairingUri?: boolean;
    }
  ) {
    const normalized = normalizeBridgeBaseUrl(bridgeBaseUrl);
    const connectionTarget =
      options?.pairingPayload?.relay ? encodeRelayConnectionTarget(options.pairingPayload) : normalized;
    const connectionLabel = options?.pairingPayload?.relay
      ? options.pairingPayload.relay.relayUrl
      : normalized;
    const connectionTransport = getConnectionTransport(connectionTarget);
    this.#connectionTarget = connectionTarget;
    this.#setState({
      bridgeBaseUrl: normalized,
      connectedBridgeUrl: connectionLabel,
      connectionTransport,
      isBusy: true,
      connectionState: "connecting",
      relayUrl: options?.pairingPayload?.relay?.relayUrl ?? this.#state.relayUrl,
      trustedPairing: Boolean(this.#savedPairingUri),
      bridgeStatus: `Connecting to ${connectionLabel}`,
    });

    try {
      await this.#connectToBridge(connectionTarget, connectionLabel, {
        persistUrlOnFailure: false,
        pairingUri: options?.persistPairingUri === false ? null : this.#savedPairingUri,
        bridgeBaseUrl: normalized,
      });
      return this.getState();
    } catch (error) {
      this.#connectionTarget = null;
      this.#setState({
        connectedBridgeUrl: null,
        connectionTransport: null,
        connectionState: "idle",
        bridgeStatus:
          error instanceof Error ? error.message : `Bridge connect failed at ${connectionLabel}`,
        isBusy: false,
        relayUrl: null,
        trustedPairing: Boolean(this.#savedPairingUri),
      });
      throw error;
    }
  }

  disconnect() {
    this.#clearReconnectTimer();
    this.#reconnectAttempt = 0;
    this.#teardownLiveSubscription();
    this.#connectionTarget = null;
    this.#savedPairingUri = null;
    this.#managedSession = null;
    void this.#preferences.clearPairing?.();
    void this.#preferences.setManagedSession?.(null);
    this.#patchPairingState("unpaired");
    this.#setState({
      connectedBridgeUrl: null,
      connectionTransport: null,
      connectionState: "idle",
      bridgeStatus: "Disconnected",
      relayUrl: null,
      trustedPairing: false,
      machines: [],
      managedSession: null,
    });
  }

  async refresh() {
    if (!this.#connectionTarget) {
      return this.getState();
    }

    const snapshot = await this.#client.fetchBridgeSnapshot(this.#connectionTarget);
    this.#replaceSnapshot(snapshot);
    return this.getState();
  }

  async resume() {
    if (this.#managedSession) {
      try {
        return await this.#connectManagedSession(
          this.#managedSession,
          this.#managedSession.machineId
        );
      } catch {
        this.#patchPairingState("reconnecting");
        this.#setState({
          connectionState: "degraded",
          isBusy: false,
        });
        return this.getState();
      }
    }

    const connectionTarget = this.#connectionTarget;
    const resumeBridgeUrl = this.#state.connectedBridgeUrl;
    if (!connectionTarget || !resumeBridgeUrl) {
      return this.getState();
    }

    this.#clearReconnectTimer();
    this.#setState({
      connectedBridgeUrl: resumeBridgeUrl,
      connectionState: "connecting",
      connectionTransport: getConnectionTransport(connectionTarget),
      isBusy: true,
      bridgeStatus: `Refreshing ${resumeBridgeUrl}`,
      trustedPairing: Boolean(this.#savedPairingUri),
    });

    try {
      await this.#connectToBridge(connectionTarget, resumeBridgeUrl, {
        persistUrlOnFailure: true,
        pairingUri: this.#savedPairingUri,
        bridgeBaseUrl: this.#state.bridgeBaseUrl,
      });
    } catch {
      this.#patchPairingState("reconnecting");
      this.#setState({
        connectedBridgeUrl: resumeBridgeUrl,
        connectionState: "degraded",
        isBusy: false,
        trustedPairing: Boolean(this.#savedPairingUri),
      });
      this.#scheduleReconnect(connectionTarget, resumeBridgeUrl, "error");
    }

    return this.getState();
  }

  async setRuntimeTarget(runtimeTarget: RuntimeTarget) {
    if (!this.#connectionTarget) {
      this.#demoController.setRuntimeTarget(runtimeTarget);
      return this.getState();
    }

    this.#setState({ isBusy: true });
    try {
      const result = await this.#client.selectBridgeRuntime(this.#connectionTarget, runtimeTarget);
      this.#replaceSnapshot(result.snapshot);
      this.#setState({ isBusy: false });
      return this.getState();
    } catch (error) {
      this.#setState({
        isBusy: false,
        bridgeStatus:
          error instanceof Error ? error.message : "Bridge runtime switch failed.",
      });
      throw error;
    }
  }

  async sendTurn(threadId: string, draft: string) {
    const trimmed = draft.trim();
    if (!trimmed) {
      return this.getState();
    }

    if (!this.#connectionTarget) {
      const error = new Error("Connect to your Mac first.");
      this.#setState({ bridgeStatus: error.message });
      throw error;
    }

    try {
      const result = await this.#client.sendBridgeTurn(this.#connectionTarget, threadId, trimmed);
      this.#replaceSnapshot(result.snapshot);
      return this.getState();
    } catch (error) {
      this.#setState({
        bridgeStatus: error instanceof Error ? error.message : "Bridge turn failed.",
      });
      throw error;
    }
  }

  async interruptThread(threadId: string) {
    if (!this.#connectionTarget || !threadId) {
      return this.getState();
    }

    try {
      const result = await this.#client.interruptBridgeTurn(this.#connectionTarget, threadId);
      this.#replaceSnapshot(result.snapshot);
      this.#setState({
        bridgeStatus: `Stopping ${threadId.slice(0, 6)}...`,
      });
      return this.getState();
    } catch (error) {
      this.#setState({
        bridgeStatus: error instanceof Error ? error.message : "Bridge interrupt failed.",
      });
      throw error;
    }
  }

  dispose() {
    this.#clearReconnectTimer();
    this.#teardownLiveSubscription();
  }

  async connectManagedMachine(machineId: string) {
    if (!this.#managedSession) {
      throw new Error("Pair a trusted machine first.");
    }

    const machines = await this.#client.listManagedMachines(this.#managedSession);
    this.#setState({
      machines: machines.machines,
    });
    return this.#connectManagedSession(this.#managedSession, machineId);
  }

  async #connectManagedSession(session: ManagedBridgeSession, machineId: string) {
    const resolved = await this.#client.resolveManagedConnection(session, machineId);
    this.#managedSession = {
      ...session,
      machineId,
    };
    this.#connectionTarget = resolved.connectionTarget;
    this.#setState({
      managedSession: this.#managedSession,
      machines: this.#state.machines.map((machine) =>
        machine.machineId === machineId ? { ...machine, online: true } : machine
      ),
      bridgeBaseUrl: resolved.machine?.localBridgeUrl ?? this.#state.bridgeBaseUrl,
      connectedBridgeUrl: resolved.connectionLabel,
      connectionTransport: resolved.connectionTransport,
      connectionState: "connecting",
      isBusy: true,
      trustedPairing: true,
      bridgeStatus: `Connecting to ${resolved.connectionLabel}`,
    });

    await this.#connectToBridge(resolved.connectionTarget, resolved.connectionLabel, {
      persistUrlOnFailure: true,
      pairingUri: null,
      bridgeBaseUrl: resolved.machine?.localBridgeUrl ?? this.#state.bridgeBaseUrl,
    });
    await this.#preferences.setManagedSession?.(this.#managedSession);
    return this.getState();
  }

  async #connectToBridge(
    connectionTarget: string,
    connectionLabel: string,
    options: {
      persistUrlOnFailure: boolean;
      pairingUri: string | null;
      bridgeBaseUrl: string;
    }
  ) {
    try {
      const [health, snapshot] = await Promise.all([
        this.#client.fetchBridgeHealth(connectionTarget),
        this.#client.fetchBridgeSnapshot(connectionTarget),
      ]);
      const connectionTransport = getConnectionTransport(connectionTarget);

      this.#replaceSnapshot(snapshot);
      await this.#preferences.setBridgeBaseUrl(options.bridgeBaseUrl);
      await this.#preferences.setPairingUri?.(options.pairingUri);
      this.#beginLiveSubscription(connectionTarget, connectionLabel);
      this.#clearReconnectTimer();
      this.#reconnectAttempt = 0;
      this.#setState({
        connectedBridgeUrl: connectionLabel,
        connectionTransport,
        connectionState: "live",
        bridgeStatus: `${connectionTransport === "relay" ? "Secure relay" : "Local bridge"} live at ${connectionLabel}`,
        isBusy: false,
        relayUrl: health.relayUrl ?? null,
        trustedPairing: Boolean(options.pairingUri),
        managedSession: this.#managedSession,
      });
      this.#patchPairingProfile({
        bridgeUrl: health.bridgeUrl,
        bridgeHints: health.bridgeHints,
        macName: health.macName,
        state: "paired",
        lastSeenAt: "Just now",
      });
    } catch (error) {
      this.#setState({
        connectedBridgeUrl: options.persistUrlOnFailure ? connectionLabel : null,
        connectionTransport: options.persistUrlOnFailure
          ? getConnectionTransport(connectionTarget)
          : null,
        connectionState: options.persistUrlOnFailure ? "degraded" : "idle",
        bridgeStatus:
          error instanceof Error ? error.message : `Bridge connect failed at ${connectionLabel}`,
        isBusy: false,
        relayUrl: this.#state.relayUrl,
        trustedPairing: Boolean(options.pairingUri),
      });
      throw error;
    }
  }

  #beginLiveSubscription(connectionTarget: string, connectionLabel: string) {
    this.#teardownLiveSubscription();
    const subscriptionVersion = ++this.#liveSubscriptionVersion;

    this.#unsubscribeLive = this.#client.subscribeToBridgeSnapshots(connectionTarget, {
      onSnapshot: (nextSnapshot) => {
        if (subscriptionVersion !== this.#liveSubscriptionVersion) {
          return;
        }

        this.#clearReconnectTimer();
        this.#reconnectAttempt = 0;
        this.#replaceSnapshot(nextSnapshot);
        this.#patchPairingState("paired");
        this.#setState({
          connectedBridgeUrl: connectionLabel,
          connectionTransport: getConnectionTransport(connectionTarget),
          connectionState: "live",
          bridgeStatus: `Connected to ${connectionLabel}`,
          isBusy: false,
          trustedPairing: Boolean(this.#savedPairingUri),
        });
      },
      onStatusChange: (status) => {
        if (subscriptionVersion !== this.#liveSubscriptionVersion) {
          return;
        }

        this.#handleLiveStatus(connectionTarget, connectionLabel, status);
      },
    });
  }

  #handleLiveStatus(
    connectionTarget: string,
    connectionLabel: string,
    status: "open" | "closed" | "error"
  ) {
    if (status === "open") {
      this.#clearReconnectTimer();
      this.#reconnectAttempt = 0;
      this.#patchPairingState("paired");
      this.#setState({
        connectedBridgeUrl: connectionLabel,
        connectionTransport: getConnectionTransport(connectionTarget),
        connectionState: "live",
        bridgeStatus: `Connected to ${connectionLabel}`,
        isBusy: false,
        trustedPairing: Boolean(this.#savedPairingUri),
      });
      return;
    }

    this.#patchPairingState("reconnecting");
    this.#setState({
      connectedBridgeUrl: connectionLabel,
      connectionTransport: getConnectionTransport(connectionTarget),
      connectionState: "degraded",
      isBusy: false,
      trustedPairing: Boolean(this.#savedPairingUri),
    });
    this.#scheduleReconnect(connectionTarget, connectionLabel, status);
  }

  #scheduleReconnect(
    connectionTarget: string,
    connectionLabel: string,
    status: "closed" | "error"
  ) {
    if (this.#reconnectTimer) {
      return;
    }

    this.#reconnectAttempt += 1;
    const delayMs = Math.min(1_000 * 2 ** (this.#reconnectAttempt - 1), 8_000);
    const failureLabel = status === "closed" ? "Live sync paused" : "Bridge error";

    this.#setState({
      bridgeStatus: `${failureLabel} at ${connectionLabel}. Retrying in ${Math.ceil(delayMs / 1000)}s.`,
    });

    this.#reconnectTimer = this.#timer.setTimeout(() => {
      this.#reconnectTimer = null;
      void this.#retryConnect(connectionTarget, connectionLabel);
    }, delayMs);
  }

  async #retryConnect(connectionTarget: string, connectionLabel: string) {
    if (this.#managedSession) {
      try {
        await this.#connectManagedSession(this.#managedSession, this.#managedSession.machineId);
      } catch {
        this.#scheduleReconnect(connectionTarget, connectionLabel, "error");
      }
      return;
    }

    if (this.#connectionTarget !== connectionTarget) {
      return;
    }

    this.#setState({
      connectionState: "connecting",
      isBusy: true,
      bridgeStatus: `Reconnecting to ${connectionLabel}`,
    });

    try {
      await this.#connectToBridge(connectionTarget, connectionLabel, {
        persistUrlOnFailure: true,
        pairingUri: this.#savedPairingUri,
        bridgeBaseUrl: this.#state.bridgeBaseUrl,
      });
    } catch {
      this.#scheduleReconnect(connectionTarget, connectionLabel, "error");
    }
  }

  #clearReconnectTimer() {
    if (!this.#reconnectTimer) {
      return;
    }

    this.#timer.clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = null;
  }

  #teardownLiveSubscription() {
    this.#liveSubscriptionVersion += 1;
    this.#unsubscribeLive?.();
    this.#unsubscribeLive = null;
  }

  #replaceSnapshot(snapshot: OffdexWorkspaceSnapshot) {
    this.#demoController.replaceSnapshot(snapshot);
  }

  #patchPairingProfile(
    patch: Partial<OffdexWorkspaceSnapshot["pairing"]>
  ) {
    const snapshot = this.#state.snapshot;
    this.#replaceSnapshot({
      ...snapshot,
      pairing: {
        ...snapshot.pairing,
        ...patch,
      },
    });
  }

  #patchPairingState(state: OffdexWorkspaceSnapshot["pairing"]["state"]) {
    this.#patchPairingProfile({
      state,
      lastSeenAt: state === "paired" ? "Just now" : state === "reconnecting" ? "Reconnecting" : "Not connected",
    });
  }

  #setState(patch: Partial<BridgeWorkspaceState>) {
    this.#state = {
      ...this.#state,
      ...patch,
    };
    const next = this.getState();
    for (const listener of this.#listeners) {
      listener(next);
    }
  }
}
