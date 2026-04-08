import { describe, expect, test } from "bun:test";
import {
  decodePairingPayload,
  extractPairingUri,
  parseManagedSession,
  serializeManagedSession,
} from "../app/webui/web-transport";

describe("web transport", () => {
  test("decodes managed machine pairing links from the terminal", () => {
    expect(
      decodePairingPayload(
        "offdex://pair?bridge=http%3A%2F%2F192.168.1.8%3A42420&name=studio-macbook&control=https%3A%2F%2Fcontrol.offdex.dev&machine=machine-1&claim=claim-1&owner=dhruv%40example.com&v=3"
      )
    ).toEqual({
      bridgeUrl: "http://192.168.1.8:42420",
      macName: "studio-macbook",
      remote: {
        controlPlaneUrl: "https://control.offdex.dev",
        machineId: "machine-1",
        claimCode: "claim-1",
        ownerLabel: "dhruv@example.com",
      },
    });
  });

  test("extracts pairing links from terminal web urls", () => {
    expect(
      extractPairingUri(
        "https://offdexapp.vercel.app/webui?bridge=http%3A%2F%2F192.168.1.8%3A42420&pair=offdex%3A%2F%2Fpair%3Fbridge%3Dhttp%253A%252F%252F192.168.1.8%253A42420%26name%3Dstudio-macbook%26control%3Dhttps%253A%252F%252Fcontrol.offdex.dev%26machine%3Dmachine-1%26claim%3Dclaim-1%26owner%3Ddhruv%2540example.com%26v%3D3"
      )
    ).toBe(
      "offdex://pair?bridge=http%3A%2F%2F192.168.1.8%3A42420&name=studio-macbook&control=https%3A%2F%2Fcontrol.offdex.dev&machine=machine-1&claim=claim-1&owner=dhruv%40example.com&v=3"
    );
  });

  test("serializes and validates trusted web machine sessions", () => {
    const serialized = serializeManagedSession({
      controlPlaneUrl: "https://control.offdex.dev",
      machineId: "machine-1",
      token: "session-token",
      ownerId: "owner-1",
      ownerLabel: "Dhruv's Mac",
      deviceId: "web-1",
    });

    expect(parseManagedSession(serialized)).toEqual({
      controlPlaneUrl: "https://control.offdex.dev",
      machineId: "machine-1",
      token: "session-token",
      ownerId: "owner-1",
      ownerLabel: "Dhruv's Mac",
      deviceId: "web-1",
    });
    expect(parseManagedSession(JSON.stringify({ token: "missing fields" }))).toBeNull();
  });
});
