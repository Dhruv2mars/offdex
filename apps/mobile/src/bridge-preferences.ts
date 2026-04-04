import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { ManagedBridgeSession } from "./bridge-client";
import type { BridgePreferencesStore } from "./bridge-workspace-controller";

const BRIDGE_BASE_URL_KEY = "offdex.bridge.base-url";
const PAIRING_URI_KEY = "offdex.bridge.pairing-uri";
const MANAGED_SESSION_KEY = "offdex.managed.session";

interface AsyncKeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
}

interface SecureKeyValueStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

interface BridgePreferencesOptions {
  asyncStorage: AsyncKeyValueStore;
  secureStore: SecureKeyValueStore | null;
}

function canUseSecureStore(store: SecureKeyValueStore | null) {
  return (
    Platform.OS !== "web" &&
    typeof store?.getItemAsync === "function" &&
    typeof store?.setItemAsync === "function" &&
    typeof store?.deleteItemAsync === "function"
  );
}

export function createBridgePreferences({
  asyncStorage,
  secureStore,
}: BridgePreferencesOptions): BridgePreferencesStore {
  const secureStoreAvailable = canUseSecureStore(secureStore);

  async function getTrustedPairingUri() {
    if (secureStoreAvailable) {
      const secureValue = await secureStore.getItemAsync(PAIRING_URI_KEY);
      if (secureValue) {
        return secureValue;
      }
    }

    const legacyValue = await asyncStorage.getItem(PAIRING_URI_KEY);
    if (!legacyValue) {
      return null;
    }

    if (secureStoreAvailable) {
      await secureStore.setItemAsync(PAIRING_URI_KEY, legacyValue);
      await asyncStorage.removeItem(PAIRING_URI_KEY);
    }

    return legacyValue;
  }

  async function getManagedSession() {
    const stored = secureStoreAvailable
      ? await secureStore.getItemAsync(MANAGED_SESSION_KEY)
      : await asyncStorage.getItem(MANAGED_SESSION_KEY);
    if (!stored) {
      return null;
    }

    return JSON.parse(stored) as ManagedBridgeSession;
  }

  return {
    async getBridgeBaseUrl() {
      return asyncStorage.getItem(BRIDGE_BASE_URL_KEY);
    },
    async setBridgeBaseUrl(value: string) {
      await asyncStorage.setItem(BRIDGE_BASE_URL_KEY, value);
    },
    async getPairingUri() {
      return getTrustedPairingUri();
    },
    async setPairingUri(value: string | null) {
      if (!value) {
        if (secureStoreAvailable) {
          await secureStore.deleteItemAsync(PAIRING_URI_KEY);
        }
        await asyncStorage.removeItem(PAIRING_URI_KEY);
        return;
      }

      if (secureStoreAvailable) {
        await secureStore.setItemAsync(PAIRING_URI_KEY, value);
        await asyncStorage.removeItem(PAIRING_URI_KEY);
        return;
      }

      await asyncStorage.setItem(PAIRING_URI_KEY, value);
    },
    async getManagedSession() {
      return getManagedSession();
    },
    async setManagedSession(value: ManagedBridgeSession | null) {
      if (!value) {
        if (secureStoreAvailable) {
          await secureStore.deleteItemAsync(MANAGED_SESSION_KEY);
        }
        await asyncStorage.removeItem(MANAGED_SESSION_KEY);
        return;
      }

      const serialized = JSON.stringify(value);
      if (secureStoreAvailable) {
        await secureStore.setItemAsync(MANAGED_SESSION_KEY, serialized);
        await asyncStorage.removeItem(MANAGED_SESSION_KEY);
        return;
      }

      await asyncStorage.setItem(MANAGED_SESSION_KEY, serialized);
    },
    async clearPairing() {
      if (secureStoreAvailable) {
        await secureStore.deleteItemAsync(PAIRING_URI_KEY);
        await secureStore.deleteItemAsync(MANAGED_SESSION_KEY);
      }
      await asyncStorage.multiRemove([
        BRIDGE_BASE_URL_KEY,
        PAIRING_URI_KEY,
        MANAGED_SESSION_KEY,
      ]);
    },
  };
}

export const bridgePreferences = createBridgePreferences({
  asyncStorage: AsyncStorage,
  secureStore: canUseSecureStore(SecureStore) ? SecureStore : null,
});
