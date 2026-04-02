import { describe, expect, test } from "bun:test";
import {
  OFFDEX_NEW_THREAD_ID,
  decodePairingUri,
  encodePairingUri,
  WorkspaceSnapshotStore,
  makeDemoWorkspaceSnapshot,
  makeMessage,
} from "../src";

describe("protocol demo snapshot", () => {
  test("publishes a shared new-thread sentinel", () => {
    expect(OFFDEX_NEW_THREAD_ID).toBe("offdex-new-thread");
  });

  test("defaults to an unpaired CLI-first local workspace", () => {
    const snapshot = makeDemoWorkspaceSnapshot();

    expect(snapshot.pairing.runtimeTarget).toBe("cli");
    expect(snapshot.pairing.state).toBe("unpaired");
    expect(snapshot.pairing.bridgeUrl).toBe("http://127.0.0.1:42420");
    expect(snapshot.pairing.bridgeHints).toContain("http://127.0.0.1:42420");
    expect(snapshot.threads.length).toBeGreaterThan(0);
    expect(snapshot.capabilityMatrix.runtimes).toEqual(["cli"]);
  });

  test("switches the paired runtime when desktop is requested", () => {
    const snapshot = makeDemoWorkspaceSnapshot("desktop");

    expect(snapshot.pairing.runtimeTarget).toBe("desktop");
    expect(snapshot.threads[0]?.runtimeTarget).toBe("desktop");
  });
});

describe("workspace snapshot store", () => {
  test("replaces the full snapshot when reconnecting to a bridge", () => {
    const store = new WorkspaceSnapshotStore();
    const nextSnapshot = makeDemoWorkspaceSnapshot("desktop");

    store.replaceSnapshot(nextSnapshot);

    const snapshot = store.getSnapshot();
    expect(snapshot.pairing.runtimeTarget).toBe("desktop");
    expect(snapshot.threads[0]?.runtimeTarget).toBe("desktop");
  });

  test("updates runtime target and keeps linux thread on cli", () => {
    const store = new WorkspaceSnapshotStore();

    store.setRuntimeTarget("desktop");
    const snapshot = store.getSnapshot();

    expect(snapshot.pairing.runtimeTarget).toBe("desktop");
    expect(snapshot.threads.find((thread) => thread.id === "thread-linux")?.runtimeTarget).toBe("cli");
    expect(snapshot.capabilityMatrix.runtimes).toEqual(["cli"]);
  });

  test("appends messages to the matching thread", () => {
    const store = new WorkspaceSnapshotStore();

    store.appendMessage({
      threadId: "thread-foundation",
      message: makeMessage("m-new", "assistant", "Bridge snapshot refreshed.", "09:14"),
      state: "running",
      updatedAt: "Now",
    });

    const thread = store.getSnapshot().threads.find((entry) => entry.id === "thread-foundation");
    expect(thread?.messages.at(-1)?.body).toBe("Bridge snapshot refreshed.");
    expect(thread?.updatedAt).toBe("Now");
  });

  test("updates local pairing details without replacing the thread timeline", () => {
    const store = new WorkspaceSnapshotStore();

    store.updatePairingProfile({
      bridgeUrl: "http://192.168.1.8:42420",
      bridgeHints: ["http://192.168.1.8:42420", "http://127.0.0.1:42420"],
      macName: "studio-macbook",
      state: "paired",
      lastSeenAt: "Now",
    });

    const snapshot = store.getSnapshot();
    expect(snapshot.pairing.bridgeUrl).toBe("http://192.168.1.8:42420");
    expect(snapshot.pairing.macName).toBe("studio-macbook");
    expect(snapshot.threads.length).toBeGreaterThan(0);
  });
});

describe("pairing uri", () => {
  test("encodes a deep link for local pairing", () => {
    const uri = encodePairingUri({
      bridgeUrl: "http://192.168.1.8:42420",
      macName: "studio-macbook",
    });

    expect(uri).toBe(
      "offdex://pair?bridge=http%3A%2F%2F192.168.1.8%3A42420&name=studio-macbook&v=1"
    );
  });

  test("decodes a deep link back into local pairing info", () => {
    const payload = decodePairingUri(
      "offdex://pair?bridge=http%3A%2F%2F192.168.1.8%3A42420&name=studio-macbook&v=1"
    );

    expect(payload).toEqual({
      bridgeUrl: "http://192.168.1.8:42420",
      macName: "studio-macbook",
      version: 1,
    });
  });

  test("rejects non-offdex pairing links", () => {
    expect(() => decodePairingUri("https://example.com")).toThrow(
      "Invalid Offdex pairing link."
    );
  });
});
