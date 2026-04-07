import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { ManagedBridgeSession } from "../src/bridge-client";

const storage = new Map<string, string>();

const asyncStorage = {
  async getItem(key: string) {
    return storage.get(key) ?? null;
  },
  async setItem(key: string, value: string) {
    storage.set(key, value);
  },
  async removeItem(key: string) {
    storage.delete(key);
  },
  async multiRemove(keys: string[]) {
    for (const key of keys) {
      storage.delete(key);
    }
  },
};

mock.module("react-native", () => ({
  Platform: { OS: "ios" },
}));

mock.module("@react-native-async-storage/async-storage", () => ({
  default: asyncStorage,
}));

mock.module("expo-secure-store", () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));

const { createBridgePreferences } = await import("../src/bridge-preferences");

describe("bridge preferences", () => {
  beforeEach(() => {
    storage.clear();
  });

  test("falls back to async storage when secure storage is unavailable", async () => {
    const preferences = createBridgePreferences({
      asyncStorage,
      secureStore: null,
    });
    const session: ManagedBridgeSession = {
      controlPlaneUrl: "https://control.offdex.dev",
      machineId: "machine-1",
      token: "token-1",
      ownerId: "owner-1",
      ownerLabel: "dhruv",
      deviceId: "device-1",
    };

    await preferences.setPairingUri?.("offdex://pair?bridge=local");
    await preferences.setManagedSession?.(session);

    expect(await preferences.getPairingUri?.()).toBe("offdex://pair?bridge=local");
    expect(await preferences.getManagedSession?.()).toEqual(session);
  });

  test("migrates legacy async pairing data into secure storage when available", async () => {
    const secureStorage = new Map<string, string>();
    const secureStore = {
      async getItemAsync(key: string) {
        return secureStorage.get(key) ?? null;
      },
      async setItemAsync(key: string, value: string) {
        secureStorage.set(key, value);
      },
      async deleteItemAsync(key: string) {
        secureStorage.delete(key);
      },
    };
    const preferences = createBridgePreferences({
      asyncStorage,
      secureStore,
    });

    await asyncStorage.setItem("offdex.bridge.pairing-uri", "offdex://pair?bridge=legacy");

    expect(await preferences.getPairingUri?.()).toBe("offdex://pair?bridge=legacy");
    expect(await asyncStorage.getItem("offdex.bridge.pairing-uri")).toBeNull();
    expect(await secureStore.getItemAsync("offdex.bridge.pairing-uri")).toBe(
      "offdex://pair?bridge=legacy"
    );
  });
});
