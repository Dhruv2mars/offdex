import type { OffdexWorkspaceSnapshot, RuntimeTarget } from "@offdex/protocol";
import {
  fetchBridgeHealth,
  fetchBridgeSnapshot,
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
  subscribeToBridgeSnapshots(
    baseUrl: string,
    handlers: {
      onSnapshot: (snapshot: OffdexWorkspaceSnapshot) => void;
      onStatusChange?: (status: "open" | "closed" | "error") => void;
    }
  ): () => void;
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
  subscribeToBridgeSnapshots,
};

export class BridgeWorkspaceController {
  #listeners = new Set<(state: BridgeWorkspaceState) => void>();
  #demoController: DemoWorkspaceController;
  #preferences: BridgePreferencesStore;
  #client: BridgeClient;
  #unsubscribeLive: (() => void) | null = null;
  #state: BridgeWorkspaceState;

  constructor(options?: {
    preferences?: BridgePreferencesStore;
    client?: BridgeClient;
    demoController?: DemoWorkspaceController;
  }) {
    this.#preferences = options?.preferences ?? {
      async getBridgeBaseUrl() {
        return null;
      },
      async setBridgeBaseUrl() {},
    };
    this.#client = options?.client ?? defaultClient;
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

  async connect(bridgeBaseUrl = this.#state.bridgeBaseUrl) {
    const normalized = normalizeBridgeBaseUrl(bridgeBaseUrl);
    this.#setState({
      bridgeBaseUrl: normalized,
      isBusy: true,
      connectionState: "connecting",
      bridgeStatus: `Connecting to ${normalized}`,
    });

    try {
      const [health, snapshot] = await Promise.all([
        this.#client.fetchBridgeHealth(normalized),
        this.#client.fetchBridgeSnapshot(normalized),
      ]);

      this.#replaceSnapshot(snapshot);
      await this.#preferences.setBridgeBaseUrl(normalized);
      this.#unsubscribeLive?.();
      this.#unsubscribeLive = this.#client.subscribeToBridgeSnapshots(normalized, {
        onSnapshot: (nextSnapshot) => {
          this.#replaceSnapshot(nextSnapshot);
        },
        onStatusChange: (status) => {
          this.#setState({
            connectedBridgeUrl: normalized,
            connectionState: status === "open" ? "live" : "degraded",
            bridgeStatus:
              status === "open"
                ? `Connected to ${normalized}`
                : status === "closed"
                  ? `Live sync paused at ${normalized}`
                  : `Bridge error at ${normalized}`,
          });
        },
      });

      this.#setState({
        connectedBridgeUrl: normalized,
        connectionState: "live",
        bridgeStatus: `${health.transport} live at ${normalized}`,
        isBusy: false,
      });
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
    this.#unsubscribeLive?.();
    this.#unsubscribeLive = null;
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
      this.#demoController.sendUserTurn(threadId, trimmed);
      return this.getState();
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

  dispose() {
    this.#unsubscribeLive?.();
    this.#unsubscribeLive = null;
  }

  #replaceSnapshot(snapshot: OffdexWorkspaceSnapshot) {
    this.#demoController.replaceSnapshot(snapshot);
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
