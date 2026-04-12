import {
  OFFDEX_NEW_THREAD_ID,
  WorkspaceSnapshotStore,
  makeMessage,
  type OffdexWorkspaceSnapshot,
  type RuntimeTarget,
} from "@offdex/protocol";

export class DemoWorkspaceController {
  #store = new WorkspaceSnapshotStore();

  getSnapshot() {
    return this.#store.getSnapshot();
  }

  subscribe(listener: (snapshot: OffdexWorkspaceSnapshot) => void) {
    return this.#store.subscribe(listener);
  }

  replaceSnapshot(snapshot: OffdexWorkspaceSnapshot) {
    this.#store.replaceSnapshot(snapshot);
  }

  setRuntimeTarget(runtimeTarget: RuntimeTarget) {
    this.#store.setRuntimeTarget(runtimeTarget);
  }

  sendUserTurn(threadId: string, draft: string) {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    const targetThreadId =
      threadId === OFFDEX_NEW_THREAD_ID ? this.#createThread(trimmed) : threadId;

    this.#store.appendMessage({
      threadId: targetThreadId,
      message: makeMessage(`user-${Date.now()}`, "user", trimmed, "Now"),
      state: "running",
      updatedAt: "Now",
    });

    this.#store.appendMessage({
      threadId: targetThreadId,
      message: makeMessage(
        `assistant-${Date.now()}`,
        "assistant",
        "Offdex bridge stub received that turn. The next step is wiring this to a live local bridge session.",
        "Now"
      ),
      state: "running",
      updatedAt: "Now",
    });
  }

  #createThread(draft: string) {
    const snapshot = this.#store.getSnapshot();
    const threadId = `thread-${Date.now()}`;

    this.#store.replaceSnapshot({
      ...snapshot,
      threads: [
        {
          id: threadId,
          title: draft,
          projectLabel: "offdex",
          threadKind: "conversation",
          sourceThreadId: null,
          reviewThreadId: null,
          runtimeTarget: snapshot.pairing.runtimeTarget,
          path: null,
          cwd: null,
          cliVersion: null,
          source: "mobile",
          agentNickname: null,
          agentRole: null,
          gitInfo: null,
          state: "idle",
          unreadCount: 0,
          updatedAt: "Now",
          messages: [],
          turns: [],
        },
        ...snapshot.threads.filter((thread) => thread.id !== OFFDEX_NEW_THREAD_ID),
      ],
    });

    return threadId;
  }
}
