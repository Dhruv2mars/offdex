import { describe, expect, test } from "bun:test";
import { OFFDEX_NEW_THREAD_ID } from "@offdex/protocol";
import { DemoWorkspaceController } from "../src/demo-workspace-controller";

describe("demo workspace controller", () => {
  test("switches runtime target through the shared store", () => {
    const controller = new DemoWorkspaceController();

    controller.setRuntimeTarget("desktop");

    expect(controller.getSnapshot().pairing.runtimeTarget).toBe("desktop");
  });

  test("appends a user turn and assistant echo", () => {
    const controller = new DemoWorkspaceController();

    controller.sendUserTurn("thread-foundation", "Bridge this to live state.");

    const thread = controller
      .getSnapshot()
      .threads.find((entry) => entry.id === "thread-foundation");

    expect(thread?.messages.at(-2)?.body).toBe("Bridge this to live state.");
    expect(thread?.messages.at(-1)?.role).toBe("assistant");
  });

  test("creates a fresh thread when asked for a new chat", () => {
    const controller = new DemoWorkspaceController();

    controller.sendUserTurn(OFFDEX_NEW_THREAD_ID, "Start a fresh mobile chat.");

    const thread = controller.getSnapshot().threads[0];

    expect(thread?.id).not.toBe(OFFDEX_NEW_THREAD_ID);
    expect(thread?.messages.at(0)?.body).toBe("Start a fresh mobile chat.");
    expect(thread?.messages.at(-1)?.role).toBe("assistant");
  });

  test("can replace the full snapshot", () => {
    const controller = new DemoWorkspaceController();
    const snapshot = controller.getSnapshot();

    controller.replaceSnapshot({
      ...snapshot,
      pairing: { ...snapshot.pairing, runtimeTarget: "desktop" },
    });

    expect(controller.getSnapshot().pairing.runtimeTarget).toBe("desktop");
  });
});
