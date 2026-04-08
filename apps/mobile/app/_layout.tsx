import "../global.css";
import { Stack } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform, Linking, AppState } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  useFonts,
} from "@expo-google-fonts/geist";
import {
  GeistMono_400Regular,
  GeistMono_500Medium,
} from "@expo-google-fonts/geist-mono";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useWorkspaceStore } from "../lib/store";
import LaunchIntentModule from "../modules/launch-intent";
import { createLaunchUrlGate } from "../src/launch-url";
import { extractOffdexPairingUri } from "../src/pairing-scan";
import { initializeWorkspaceFromLaunch } from "../src/initial-pairing";
import { feedbackError, feedbackSuccess } from "../src/feedback";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    GeistMono_400Regular,
    GeistMono_500Medium,
  });
  const initialize = useWorkspaceStore((s) => s.initialize);
  const connectFromPairingUri = useWorkspaceStore((s) => s.connectFromPairingUri);
  const launchUrlGate = useRef(createLaunchUrlGate());

  // Initialize workspace on mount
  useEffect(() => {
    const setup = async () => {
      await initializeWorkspaceFromLaunch({
        candidates: [
          launchUrlGate.current(LaunchIntentModule.consumePendingUrl()),
          launchUrlGate.current(await Linking.getInitialURL()),
        ],
        connectFromPairingUri,
        initialize,
        onConnected: () => {
          void feedbackSuccess();
        },
        onError: () => {
          void feedbackError();
        },
      });
    };

    void setup();
  }, [initialize, connectFromPairingUri]);

  // Handle deep links
  useEffect(() => {
    const handleUrl = async (url: string) => {
      const pairingUri = extractOffdexPairingUri(launchUrlGate.current(url));
      if (pairingUri) {
        try {
          await connectFromPairingUri(pairingUri);
          void feedbackSuccess();
        } catch {
          void feedbackError();
        }
      }
    };

    const subscription = LaunchIntentModule.addListener("onUrl", ({ url }) => {
      void handleUrl(url);
    });

    const linkingSubscription = Linking.addEventListener("url", (event) => {
      void handleUrl(event.url);
    });

    return () => {
      subscription.remove();
      linkingSubscription.remove();
    };
  }, [connectFromPairingUri]);

  // Handle app resume
  useEffect(() => {
    let appState = AppState.currentState;
    const refresh = useWorkspaceStore.getState().refresh;

    const subscription = AppState.addEventListener("change", (nextState) => {
      const didResume =
        (appState === "background" || appState === "inactive") &&
        nextState === "active";
      appState = nextState;

      if (didResume) {
        void refresh().catch(() => {
          void feedbackError();
        });
      }
    });

    return () => subscription.remove();
  }, []);

  // Set Android navigation bar color
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void NavigationBar.setButtonStyleAsync("dark").catch(() => {});
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#ffffff" },
          animation: "fade",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="chat/[id]"
          options={{
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="pair"
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
