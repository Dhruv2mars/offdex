import { describe, expect, test } from "bun:test";
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
