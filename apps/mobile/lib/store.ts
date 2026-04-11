import { create } from "zustand";
import {
  BridgeWorkspaceController,
  type BridgeWorkspaceState,
} from "../src/bridge-workspace-controller";
import { bridgePreferences } from "../src/bridge-preferences";
import { OFFDEX_NEW_THREAD_ID, type OffdexThread } from "@offdex/protocol";

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

export type ConnectionState = BridgeWorkspaceState["connectionState"];
export type ConnectionTransport = BridgeWorkspaceState["connectionTransport"];

export interface WorkspaceStore extends BridgeWorkspaceState {
  // Controller reference
  controller: BridgeWorkspaceController;

  // Derived state
  isConnected: boolean;
  isConnecting: boolean;
  canSendMessage: boolean;

  // Selected thread
  selectedThreadId: string;
  activeThread: OffdexThread | null;

  // UI State
  draft: string;
  isAwaitingNewThread: boolean;

  // Actions
  initialize: () => Promise<void>;
  selectThread: (threadId: string) => void;
  setDraft: (draft: string) => void;
  sendMessage: () => Promise<void>;
  stopThread: () => Promise<void>;
  startNewThread: () => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  connectFromPairingUri: (uri: string) => Promise<void>;
  connectMachine: (machineId: string) => Promise<void>;
  refresh: () => Promise<void>;
  refreshMachines: () => Promise<void>;
  setBridgeUrl: (url: string) => void;
  setRuntimeTarget: (target: "cli" | "desktop") => Promise<void>;
}

// ════════════════════════════════════════════════════════════════════════════
// Helper: Create draft thread
// ════════════════════════════════════════════════════════════════════════════

function createDraftThread(
  macName: string,
  runtimeTarget: "cli" | "desktop",
  isAwaiting: boolean
): OffdexThread {
  return {
    id: OFFDEX_NEW_THREAD_ID,
    title: "New chat",
    projectLabel: macName || "offdex",
    runtimeTarget,
    path: null,
    cwd: null,
    cliVersion: null,
    source: "mobile",
    agentNickname: null,
    agentRole: null,
    gitInfo: null,
    state: "idle",
    unreadCount: 0,
    updatedAt: isAwaiting ? "Starting..." : "Ready",
    messages: [],
    turns: [],
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Store
// ════════════════════════════════════════════════════════════════════════════

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => {
  const controller = new BridgeWorkspaceController({
    preferences: bridgePreferences,
  });

  // Get initial state
  const initialState = controller.getState();

  // Subscribe to controller updates
  controller.subscribe((state) => {
    const store = get();
    const threads = state.snapshot.threads;
    const selectedId = store.selectedThreadId;
    const isConnected = state.connectionState === "live";
    const codexReady = state.codexAccount?.isAuthenticated ?? false;

    // Update selected thread if current selection is invalid
    let newSelectedId = selectedId;
    if (store.isAwaitingNewThread && threads[0]?.id && threads[0].id !== OFFDEX_NEW_THREAD_ID) {
      newSelectedId = threads[0].id;
      set({ isAwaitingNewThread: false });
    } else if (!selectedId && threads[0]?.id) {
      newSelectedId = threads[0].id;
    } else if (selectedId !== OFFDEX_NEW_THREAD_ID && !threads.some((t) => t.id === selectedId)) {
      newSelectedId = threads[0]?.id ?? "";
    }

    // Get active thread
    const isDraft = newSelectedId === OFFDEX_NEW_THREAD_ID;
    const activeThread = isDraft
      ? createDraftThread(
          state.snapshot.pairing.macName,
          state.runtimeTarget,
          store.isAwaitingNewThread
        )
      : threads.find((t) => t.id === newSelectedId) ?? threads[0] ?? null;

    set({
      ...state,
      selectedThreadId: newSelectedId,
      activeThread,
      isConnected,
      isConnecting: state.connectionState === "connecting",
      canSendMessage: isConnected && codexReady && activeThread?.state !== "running",
    });
  });

  return {
    // Initial controller state
    ...initialState,
    controller,

    // Derived state
    isConnected: false,
    isConnecting: false,
    canSendMessage: false,

    // Selected thread
    selectedThreadId: initialState.snapshot.threads[0]?.id ?? "",
    activeThread: initialState.snapshot.threads[0] ?? null,

    // UI State
    draft: "",
    isAwaitingNewThread: false,

    // ════════════════════════════════════════════════════════════════════════
    // Actions
    // ════════════════════════════════════════════════════════════════════════

    initialize: async () => {
      await controller.hydrate();
    },

    selectThread: (threadId: string) => {
      const state = get();
      const threads = state.snapshot.threads;
      const isDraft = threadId === OFFDEX_NEW_THREAD_ID;
      const activeThread = isDraft
        ? createDraftThread(
            state.snapshot.pairing.macName,
            state.runtimeTarget,
            false
          )
        : threads.find((t) => t.id === threadId) ?? null;

      set({
        selectedThreadId: threadId,
        activeThread,
        isAwaitingNewThread: false,
        draft: "",
      });
    },

    setDraft: (draft: string) => {
      set({ draft });
    },

    sendMessage: async () => {
      const state = get();
      const { activeThread, draft, isConnected, codexAccount } = state;

      if (!isConnected || !codexAccount?.isAuthenticated || !draft.trim()) {
        return;
      }

      const threadId = activeThread?.id ?? OFFDEX_NEW_THREAD_ID;
      const message = draft;

      // Clear draft and set awaiting if new thread
      set({
        draft: "",
        isAwaitingNewThread: threadId === OFFDEX_NEW_THREAD_ID,
      });

      try {
        const nextState = await controller.sendTurn(threadId, message);
        // Auto-select new thread if created
        if (threadId === OFFDEX_NEW_THREAD_ID) {
          const newThreadId = nextState.snapshot.threads[0]?.id;
          if (newThreadId && newThreadId !== OFFDEX_NEW_THREAD_ID) {
            set({
              selectedThreadId: newThreadId,
              isAwaitingNewThread: false,
            });
          }
        }
      } catch {
        // Restore draft on error
        set({ draft: message, isAwaitingNewThread: false });
        throw new Error("Failed to send message");
      }
    },

    stopThread: async () => {
      const state = get();
      if (!state.activeThread) return;
      await controller.interruptThread(state.activeThread.id);
    },

    startNewThread: () => {
      const state = get();
      set({
        selectedThreadId: OFFDEX_NEW_THREAD_ID,
        activeThread: createDraftThread(
          state.snapshot.pairing.macName,
          state.runtimeTarget,
          false
        ),
        isAwaitingNewThread: false,
        draft: "",
      });
    },

    connect: async () => {
      await controller.connect();
    },

    disconnect: () => {
      controller.disconnect();
    },

    connectFromPairingUri: async (uri: string) => {
      await controller.connectFromPairingUri(uri);
    },

    connectMachine: async (machineId: string) => {
      await controller.connectManagedMachine(machineId);
    },

    refresh: async () => {
      const state = get();
      if (state.connectionState === "live") {
        await controller.refresh();
      } else {
        await controller.resume();
      }
    },

    refreshMachines: async () => {
      await controller.refreshManagedMachines();
    },

    setBridgeUrl: (url: string) => {
      controller.setBridgeBaseUrl(url);
    },

    setRuntimeTarget: async (target: "cli" | "desktop") => {
      await controller.setRuntimeTarget(target);
    },
  };
});

// ════════════════════════════════════════════════════════════════════════════
// Selector Hooks
// ════════════════════════════════════════════════════════════════════════════

export const useThreads = () => useWorkspaceStore((s) => s.snapshot.threads);
export const useActiveThread = () => useWorkspaceStore((s) => s.activeThread);
export const useConnectionState = () => useWorkspaceStore((s) => s.connectionState);
export const useIsConnected = () => useWorkspaceStore((s) => s.isConnected);
export const useMachines = () => useWorkspaceStore((s) => s.machines);
export const useCodexAccount = () => useWorkspaceStore((s) => s.codexAccount);
export const useBridgeStatus = () => useWorkspaceStore((s) => s.bridgeStatus);
