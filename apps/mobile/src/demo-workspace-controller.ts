import {
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

    this.#store.appendMessage({
      threadId,
      message: makeMessage(`user-${Date.now()}`, "user", trimmed, "Now"),
      state: "running",
      updatedAt: "Now",
    });

    this.#store.appendMessage({
      threadId,
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
}
