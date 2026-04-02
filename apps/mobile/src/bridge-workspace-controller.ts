import {
  decodePairingUri,
  type OffdexWorkspaceSnapshot,
  type RuntimeTarget,
} from "@offdex/protocol";
import {
  fetchBridgeHealth,
  fetchBridgeSnapshot,
  interruptBridgeTurn,
  normalizeBridgeBaseUrl,
  sendBridgeTurn,
  selectBridgeRuntime,
  subscribeToBridgeSnapshots,
  type BridgeHealth,
} from "./bridge-client";
import { DemoWorkspaceController } from "./demo-workspace-controller";

export interface BridgePreferencesStore {
  getBridgeBaseUrl(): Promise<string | null>;
  setBridgeBaseUrl(value: string): Promise<void>;
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
  connectionState: "idle" | "connecting" | "live" | "degraded";
  bridgeStatus: string;
  isBusy: boolean;
}

const defaultClient: BridgeClient = {
  fetchBridgeHealth,
  fetchBridgeSnapshot,
  selectBridgeRuntime,
  sendBridgeTurn,
  interruptBridgeTurn,
  subscribeToBridgeSnapshots,
};

const defaultTimerDriver: BridgeTimerDriver = {
  setTimeout(callback, delayMs) {
    return globalThis.setTimeout(callback, delayMs);
  },
  clearTimeout(timerId) {
    globalThis.clearTimeout(timerId as ReturnType<typeof setTimeout>);
  },
};

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
      connectionState: "idle",
      bridgeStatus: "Not connected",
      isBusy: false,
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
    this.#setState({ bridgeBaseUrl: value });
  }

  async connectFromPairingUri(uri: string) {
    const payload = decodePairingUri(uri);
    this.#patchPairingProfile({
      bridgeUrl: payload.bridgeUrl,
      macName: payload.macName,
    });
    return this.connect(payload.bridgeUrl);
  }

  async connect(bridgeBaseUrl = this.#state.bridgeBaseUrl) {
    const normalized = normalizeBridgeBaseUrl(bridgeBaseUrl);
    this.#setState({
      bridgeBaseUrl: normalized,
      connectedBridgeUrl: normalized,
      isBusy: true,
      connectionState: "connecting",
      bridgeStatus: `Connecting to ${normalized}`,
    });

    try {
      await this.#connectToBridge(normalized, { persistUrlOnFailure: false });
      return this.getState();
    } catch (error) {
      this.#setState({
        connectedBridgeUrl: null,
        connectionState: "idle",
        bridgeStatus:
          error instanceof Error ? error.message : `Bridge connect failed at ${normalized}`,
        isBusy: false,
      });
      throw error;
    }
  }

  disconnect() {
    this.#clearReconnectTimer();
    this.#reconnectAttempt = 0;
    this.#teardownLiveSubscription();
    this.#patchPairingState("unpaired");
    this.#setState({
      connectedBridgeUrl: null,
      connectionState: "idle",
      bridgeStatus: "Disconnected",
    });
  }

  async refresh() {
    if (!this.#state.connectedBridgeUrl) {
      return this.getState();
    }

    const snapshot = await this.#client.fetchBridgeSnapshot(this.#state.connectedBridgeUrl);
    this.#replaceSnapshot(snapshot);
    return this.getState();
  }

  async resume() {
    const resumeBridgeUrl = this.#state.connectedBridgeUrl;
    if (!resumeBridgeUrl) {
      return this.getState();
    }

    this.#clearReconnectTimer();
    this.#setState({
      connectedBridgeUrl: resumeBridgeUrl,
      connectionState: "connecting",
      isBusy: true,
      bridgeStatus: `Refreshing ${resumeBridgeUrl}`,
    });

    try {
      await this.#connectToBridge(resumeBridgeUrl, { persistUrlOnFailure: true });
    } catch {
      this.#patchPairingState("reconnecting");
      this.#setState({
        connectedBridgeUrl: resumeBridgeUrl,
        connectionState: "degraded",
        isBusy: false,
      });
      this.#scheduleReconnect(resumeBridgeUrl, "error");
    }

    return this.getState();
  }

  async setRuntimeTarget(runtimeTarget: RuntimeTarget) {
    if (!this.#state.connectedBridgeUrl) {
      this.#demoController.setRuntimeTarget(runtimeTarget);
      return this.getState();
    }

    this.#setState({ isBusy: true });
    try {
      const result = await this.#client.selectBridgeRuntime(
        this.#state.connectedBridgeUrl,
        runtimeTarget
      );
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

    if (!this.#state.connectedBridgeUrl) {
      const error = new Error("Connect to your Mac first.");
      this.#setState({ bridgeStatus: error.message });
      throw error;
    }

    try {
      const result = await this.#client.sendBridgeTurn(
        this.#state.connectedBridgeUrl,
        threadId,
        trimmed
      );
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
    if (!this.#state.connectedBridgeUrl || !threadId) {
      return this.getState();
    }

    try {
      const result = await this.#client.interruptBridgeTurn(
        this.#state.connectedBridgeUrl,
        threadId
      );
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

  async #connectToBridge(
    normalized: string,
    options: { persistUrlOnFailure: boolean }
  ) {
    try {
      const [health, snapshot] = await Promise.all([
        this.#client.fetchBridgeHealth(normalized),
        this.#client.fetchBridgeSnapshot(normalized),
      ]);

      this.#replaceSnapshot(snapshot);
      await this.#preferences.setBridgeBaseUrl(normalized);
      this.#beginLiveSubscription(normalized);
      this.#clearReconnectTimer();
      this.#reconnectAttempt = 0;
      this.#setState({
        connectedBridgeUrl: normalized,
        connectionState: "live",
        bridgeStatus: `${health.transport} live at ${normalized}`,
        isBusy: false,
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
        connectedBridgeUrl: options.persistUrlOnFailure ? normalized : null,
        connectionState: options.persistUrlOnFailure ? "degraded" : "idle",
        bridgeStatus:
          error instanceof Error ? error.message : `Bridge connect failed at ${normalized}`,
        isBusy: false,
      });
      throw error;
    }
  }

  #beginLiveSubscription(normalized: string) {
    this.#teardownLiveSubscription();
    const subscriptionVersion = ++this.#liveSubscriptionVersion;

    this.#unsubscribeLive = this.#client.subscribeToBridgeSnapshots(normalized, {
      onSnapshot: (nextSnapshot) => {
        if (subscriptionVersion !== this.#liveSubscriptionVersion) {
          return;
        }

        this.#clearReconnectTimer();
        this.#reconnectAttempt = 0;
        this.#replaceSnapshot(nextSnapshot);
        this.#patchPairingState("paired");
        this.#setState({
          connectedBridgeUrl: normalized,
          connectionState: "live",
          bridgeStatus: `Connected to ${normalized}`,
          isBusy: false,
        });
      },
      onStatusChange: (status) => {
        if (subscriptionVersion !== this.#liveSubscriptionVersion) {
          return;
        }

        this.#handleLiveStatus(normalized, status);
      },
    });
  }

  #handleLiveStatus(baseUrl: string, status: "open" | "closed" | "error") {
    if (status === "open") {
      this.#clearReconnectTimer();
      this.#reconnectAttempt = 0;
      this.#patchPairingState("paired");
      this.#setState({
        connectedBridgeUrl: baseUrl,
        connectionState: "live",
        bridgeStatus: `Connected to ${baseUrl}`,
        isBusy: false,
      });
      return;
    }

    this.#patchPairingState("reconnecting");
    this.#setState({
      connectedBridgeUrl: baseUrl,
      connectionState: "degraded",
      isBusy: false,
    });
    this.#scheduleReconnect(baseUrl, status);
  }

  #scheduleReconnect(baseUrl: string, status: "closed" | "error") {
    if (this.#reconnectTimer) {
      return;
    }

    this.#reconnectAttempt += 1;
    const delayMs = Math.min(1_000 * 2 ** (this.#reconnectAttempt - 1), 8_000);
    const failureLabel = status === "closed" ? "Live sync paused" : "Bridge error";

    this.#setState({
      bridgeStatus: `${failureLabel} at ${baseUrl}. Retrying in ${Math.ceil(delayMs / 1000)}s.`,
    });

    this.#reconnectTimer = this.#timer.setTimeout(() => {
      this.#reconnectTimer = null;
      void this.#retryConnect(baseUrl);
    }, delayMs);
  }

  async #retryConnect(baseUrl: string) {
    if (this.#state.connectedBridgeUrl !== baseUrl) {
      return;
    }

    this.#setState({
      connectionState: "connecting",
      isBusy: true,
      bridgeStatus: `Reconnecting to ${baseUrl}`,
    });

    try {
      await this.#connectToBridge(baseUrl, { persistUrlOnFailure: true });
    } catch {
      this.#scheduleReconnect(baseUrl, "error");
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
