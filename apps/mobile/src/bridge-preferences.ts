import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { BridgePreferencesStore } from "./bridge-workspace-controller";

const BRIDGE_BASE_URL_KEY = "offdex.bridge.base-url";
const PAIRING_URI_KEY = "offdex.bridge.pairing-uri";

async function getTrustedPairingUri() {
  const secureValue = await SecureStore.getItemAsync(PAIRING_URI_KEY);
  if (secureValue) {
    return secureValue;
  }

  const legacyValue = await AsyncStorage.getItem(PAIRING_URI_KEY);
  if (!legacyValue) {
    return null;
  }

  await SecureStore.setItemAsync(PAIRING_URI_KEY, legacyValue);
  await AsyncStorage.removeItem(PAIRING_URI_KEY);
  return legacyValue;
}

export const bridgePreferences: BridgePreferencesStore = {
  async getBridgeBaseUrl() {
    return AsyncStorage.getItem(BRIDGE_BASE_URL_KEY);
  },
  async setBridgeBaseUrl(value: string) {
    await AsyncStorage.setItem(BRIDGE_BASE_URL_KEY, value);
  },
  async getPairingUri() {
    return getTrustedPairingUri();
  },
  async setPairingUri(value: string | null) {
    if (!value) {
      await SecureStore.deleteItemAsync(PAIRING_URI_KEY);
      await AsyncStorage.removeItem(PAIRING_URI_KEY);
      return;
    }

    await SecureStore.setItemAsync(PAIRING_URI_KEY, value);
    await AsyncStorage.removeItem(PAIRING_URI_KEY);
  },
  async clearPairing() {
    await SecureStore.deleteItemAsync(PAIRING_URI_KEY);
    await AsyncStorage.multiRemove([BRIDGE_BASE_URL_KEY, PAIRING_URI_KEY]);
  },
};
