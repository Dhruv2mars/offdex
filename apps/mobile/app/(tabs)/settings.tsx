import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Alert, Linking, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Bug,
  ExternalLink,
  FileText,
  Laptop,
  MessageCircle,
  Monitor,
  Shield,
  Terminal,
  Trash2,
  Zap,
} from "../../lib/icons";

import { Pressable, ScrollView, Text, View } from "../../lib/tw";
import { cn } from "../../lib/utils";
import { useWorkspaceStore } from "../../lib/store";
import {
  appBuildNumber,
  appVersion,
  offdexDocsUrl,
  offdexFeedbackUrl,
  offdexIssuesUrl,
  offdexRepositoryUrl,
} from "../../src/app-config";
import { feedbackError, feedbackSelection, feedbackSuccess, feedbackWarning } from "../../src/feedback";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";

function stateLabel(connectionState: "idle" | "connecting" | "live" | "degraded") {
  if (connectionState === "live") return "Live";
  if (connectionState === "connecting") return "Connecting";
  if (connectionState === "degraded") return "Recovering";
  return "Offline";
}

export default function SettingsScreen() {
  const [clearDataConfirmVisible, setClearDataConfirmVisible] = useState(false);
  const runtimeTarget = useWorkspaceStore((s) => s.runtimeTarget);
  const connectionState = useWorkspaceStore((s) => s.connectionState);
  const bridgeStatus = useWorkspaceStore((s) => s.bridgeStatus);
  const codexAccount = useWorkspaceStore((s) => s.codexAccount);
  const pairing = useWorkspaceStore((s) => s.snapshot.pairing);
  const setRuntimeTarget = useWorkspaceStore((s) => s.setRuntimeTarget);
  const disconnect = useWorkspaceStore((s) => s.disconnect);

  const confirmClearData = useCallback(() => {
    setClearDataConfirmVisible(false);
    disconnect();
    void feedbackSuccess();
  }, [disconnect]);

  const handleRuntimeTarget = useCallback(
    async (target: "cli" | "desktop") => {
      void feedbackSelection();
      try {
        await setRuntimeTarget(target);
        void feedbackSuccess();
      } catch {
        void feedbackError();
      }
    },
    [setRuntimeTarget]
  );

  const handleClearData = useCallback(() => {
    void feedbackWarning();

    if (Platform.OS === "web") {
      setClearDataConfirmVisible(true);
      return;
    }

    Alert.alert(
      "Clear All Data",
      "This will disconnect from your Mac and clear all local data. You'll need to pair again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: confirmClearData,
        },
      ]
    );
  }, [confirmClearData]);

  const openLink = useCallback((url: string) => {
    void feedbackSelection();
    Linking.openURL(url);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1, backgroundColor: "#ffffff" }}
        contentContainerStyle={{ backgroundColor: "#ffffff", paddingBottom: 28 }}
      >
        <View className="px-4 pb-4 pt-3">
          <Text className="font-mono text-xs uppercase text-muted-foreground">
            Control room
          </Text>
          <Text className="mt-2 text-4xl font-semibold text-foreground">
            Control
          </Text>
        </View>

        <View className="mx-4 rounded-lg bg-foreground p-5">
          <Text className="font-mono text-xs uppercase text-background/60">
            Bridge authority
          </Text>
          <Text className="mt-8 text-2xl font-semibold text-background">
            {pairing.macName || "No Mac paired"}
          </Text>
          <Text className="mt-3 text-sm leading-6 text-background/60">
            {bridgeStatus}
          </Text>
        </View>

        <View className="mx-4 mt-3 flex-row gap-2">
          {([
            ["State", stateLabel(connectionState), Zap],
            ["Codex", codexAccount?.isAuthenticated ? "Signed in" : "Sign in", Shield],
            ["Version", appVersion, Laptop],
          ] as const).map(([label, value, Icon]) => (
            <View className="flex-1 rounded-lg bg-card p-3 shadow-card" key={String(label)}>
              <Icon size={16} color="#666666" />
              <Text className="mt-3 font-mono text-[10px] uppercase text-muted-foreground">
                {label}
              </Text>
              <Text className="mt-1 text-xs font-semibold text-foreground" numberOfLines={1}>
                {value}
              </Text>
            </View>
          ))}
        </View>

        <View className="mx-4 mt-5 rounded-lg bg-card p-4 shadow-card">
          <Text className="font-mono text-xs uppercase text-muted-foreground">
            Runtime target
          </Text>
          <View className="mt-4 flex-row gap-3">
            {([
              ["cli", "CLI", "Codex in terminal", Terminal],
              ["desktop", "Desktop", "Codex desktop app", Monitor],
            ] as const).map(([target, label, detail, Icon]) => (
              <Pressable
                className={cn(
                  "flex-1 rounded-lg p-4 active:bg-muted",
                  runtimeTarget === target ? "bg-foreground" : "bg-background shadow-border"
                )}
                key={String(target)}
                onPress={() => void handleRuntimeTarget(target as "cli" | "desktop")}
              >
                <Icon size={18} color={runtimeTarget === target ? "#ffffff" : "#171717"} />
                <Text
                  className={cn(
                    "mt-4 text-base font-semibold",
                    runtimeTarget === target ? "text-background" : "text-foreground"
                  )}
                >
                  {label}
                </Text>
                <Text
                  className={cn(
                    "mt-1 text-xs leading-5",
                    runtimeTarget === target ? "text-background/60" : "text-muted-foreground"
                  )}
                >
                  {detail}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="mx-4 mt-5 rounded-lg bg-card p-4 shadow-card">
          <Text className="font-mono text-xs uppercase text-muted-foreground">
            Project links
          </Text>
          <View className="mt-4 gap-2">
            {([
              [FileText, "Documentation", offdexDocsUrl],
              [ExternalLink, "GitHub", offdexRepositoryUrl],
              [Bug, "Report an issue", offdexIssuesUrl],
              [MessageCircle, "Send feedback", offdexFeedbackUrl],
            ] as const).map(([Icon, label, url]) => (
              <Pressable
                className="flex-row items-center gap-3 rounded-lg bg-background px-4 py-3 shadow-border active:bg-muted"
                key={String(label)}
                onPress={() => openLink(String(url))}
              >
                <Icon size={18} color="#666666" />
                <Text className="flex-1 text-sm font-medium text-foreground">{label}</Text>
                <Text className="text-lg text-muted-foreground">/</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="mx-4 mt-5 rounded-lg bg-card p-4 shadow-card">
          <Pressable
            className="flex-row items-center gap-3 rounded-lg bg-[#fff1f0] px-4 py-4 active:opacity-80"
            onPress={handleClearData}
          >
            <Trash2 size={18} color="#ff5b4f" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-destructive">
                Clear local trust
              </Text>
              <Text className="mt-1 text-xs text-[#b42318]">
                Disconnect and require pairing again.
              </Text>
            </View>
          </Pressable>
        </View>

        <Text className="mt-8 text-center text-xs text-muted-foreground">
          Offdex {appVersion} ({appBuildNumber})
        </Text>
      </ScrollView>

      {Platform.OS === "web" &&
        clearDataConfirmVisible &&
        typeof document !== "undefined" &&
        createPortal(
          <View style={styles.webConfirmBackdrop}>
            <Card className="w-full max-w-sm p-5">
              <Text className="text-lg font-semibold text-foreground">
                Clear All Data
              </Text>
              <Text className="mt-2 text-sm leading-relaxed text-muted-foreground">
                This will disconnect from your Mac and clear all local data. You'll need to pair again.
              </Text>
              <View className="mt-5 flex-row gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onPress={() => setClearDataConfirmVisible(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onPress={confirmClearData}
                >
                  Clear
                </Button>
              </View>
            </Card>
          </View>,
          document.body
        )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  webConfirmBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    paddingHorizontal: 24,
    position: "fixed" as never,
    right: 0,
    top: 0,
    zIndex: 9999,
  },
});
