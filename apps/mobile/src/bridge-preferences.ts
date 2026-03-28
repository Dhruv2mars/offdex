import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BridgePreferencesStore } from "./bridge-workspace-controller";

const BRIDGE_BASE_URL_KEY = "offdex.bridge.base-url";

export const bridgePreferences: BridgePreferencesStore = {
  async getBridgeBaseUrl() {
    return AsyncStorage.getItem(BRIDGE_BASE_URL_KEY);
  },
  async setBridgeBaseUrl(value: string) {
    await AsyncStorage.setItem(BRIDGE_BASE_URL_KEY, value);
  },
};
