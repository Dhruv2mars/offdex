import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, Linking, AppState } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useWorkspaceStore } from "../lib/store";
import LaunchIntentModule from "../modules/launch-intent";
import { extractOffdexPairingUri } from "../src/pairing-scan";
import { resolveInitialPairingUri } from "../src/initial-pairing";
import { feedbackError, feedbackSuccess } from "../src/feedback";

export default function RootLayout() {
  const initialize = useWorkspaceStore((s) => s.initialize);
  const connectFromPairingUri = useWorkspaceStore((s) => s.connectFromPairingUri);

  // Initialize workspace on mount
  useEffect(() => {
    const setup = async () => {
      // Check for initial pairing URL
      const initialPairingUri = resolveInitialPairingUri([
        LaunchIntentModule.consumePendingUrl(),
        await Linking.getInitialURL(),
      ]);

      if (initialPairingUri) {
        const pairingUri = extractOffdexPairingUri(initialPairingUri);
        if (pairingUri) {
          try {
            await connectFromPairingUri(pairingUri);
            void feedbackSuccess();
          } catch {
            void feedbackError();
          }
          return;
        }
      }

      // Normal initialization
      await initialize();
    };

    void setup();
  }, [initialize, connectFromPairingUri]);

  // Handle deep links
  useEffect(() => {
    const handleUrl = async (url: string) => {
      const pairingUri = extractOffdexPairingUri(url);
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

    const linkingSubscription = Linking.addEventListener("url", ({ url }) => {
      void handleUrl(url);
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
    void NavigationBar.setBackgroundColorAsync("#09090b").catch(() => {});
    void NavigationBar.setButtonStyleAsync("light").catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#09090b" },
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
