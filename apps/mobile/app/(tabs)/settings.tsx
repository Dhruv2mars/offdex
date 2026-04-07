import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Alert, Linking, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Terminal,
  Monitor,
  ExternalLink,
  ChevronRight,
  Trash2,
  Bug,
  MessageCircle,
  FileText,
  Shield,
  Laptop,
  Zap,
} from "../../lib/icons";

import { View, Text, Pressable, ScrollView } from "../../lib/tw";
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
import { feedbackSelection, feedbackSuccess, feedbackError, feedbackWarning } from "../../src/feedback";

import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ScreenHeader } from "../../components/layout/header";
import { Separator } from "../../components/ui/separator";
import { StatusBadge } from "../../components/ui/badge";

// ════════════════════════════════════════════════════════════════════════════
// Settings Row Component
// ════════════════════════════════════════════════════════════════════════════

interface SettingsRowProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  variant?: "default" | "destructive";
}

function SettingsRow({
  icon: Icon,
  label,
  description,
  value,
  onPress,
  trailing,
  variant = "default",
}: SettingsRowProps) {
  const content = (
    <View className="flex-row items-center py-3">
      <View
        className={cn(
          "w-9 h-9 rounded-lg items-center justify-center mr-3",
          variant === "destructive" ? "bg-destructive/10" : "bg-muted"
        )}
      >
        <Icon
          size={18}
          color={variant === "destructive" ? "#ef4444" : "#a1a1aa"}
        />
      </View>
      <View className="flex-1">
        <Text
          className={cn(
            "text-sm font-medium",
            variant === "destructive" ? "text-destructive" : "text-foreground"
          )}
        >
          {label}
        </Text>
        {description && (
          <Text className="text-xs text-muted-foreground mt-0.5">
            {description}
          </Text>
        )}
      </View>
      {value && (
        <Text className="text-sm text-muted-foreground mr-2">{value}</Text>
      )}
      {trailing}
      {onPress && !trailing && (
        <ChevronRight size={16} color="#71717a" />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className="active:bg-muted rounded-lg -mx-2 px-2">
        {content}
      </Pressable>
    );
  }

  return content;
}

// ════════════════════════════════════════════════════════════════════════════
// Settings Section Component
// ════════════════════════════════════════════════════════════════════════════

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View className="mb-6">
      <Text className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-4">
        {title}
      </Text>
      <Card className="mx-4">{children}</Card>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Settings Screen
// ════════════════════════════════════════════════════════════════════════════

function getConnectionStateLabel(
  connectionState: "idle" | "connecting" | "live" | "degraded"
) {
  if (connectionState === "live") {
    return "Live";
  }

  if (connectionState === "connecting") {
    return "Connecting";
  }

  if (connectionState === "degraded") {
    return "Recovering";
  }

  return "Offline";
}

function getConnectionStateVariant(
  connectionState: "idle" | "connecting" | "live" | "degraded"
): "success" | "warning" | "secondary" {
  if (connectionState === "live") {
    return "success";
  }

  if (connectionState === "connecting" || connectionState === "degraded") {
    return "warning";
  }

  return "secondary";
}

export default function SettingsScreen() {
  const [clearDataConfirmVisible, setClearDataConfirmVisible] = useState(false);

  // Store state
  const runtimeTarget = useWorkspaceStore((s) => s.runtimeTarget);
  const connectionState = useWorkspaceStore((s) => s.connectionState);
  const bridgeStatus = useWorkspaceStore((s) => s.bridgeStatus);
  const codexAccount = useWorkspaceStore((s) => s.codexAccount);
  const pairing = useWorkspaceStore((s) => s.snapshot.pairing);

  // Actions
  const setRuntimeTarget = useWorkspaceStore((s) => s.setRuntimeTarget);
  const disconnect = useWorkspaceStore((s) => s.disconnect);

  const confirmClearData = useCallback(() => {
    setClearDataConfirmVisible(false);
    disconnect();
    void feedbackSuccess();
  }, [disconnect]);

  const handleRuntimeToggle = useCallback(async () => {
    void feedbackSelection();
    const newTarget = runtimeTarget === "cli" ? "desktop" : "cli";
    try {
      await setRuntimeTarget(newTarget);
      void feedbackSuccess();
    } catch {
      void feedbackError();
    }
  }, [runtimeTarget, setRuntimeTarget]);

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
          onPress: () => {
            confirmClearData();
          },
        },
      ]
    );
  }, [confirmClearData]);

  const openLink = useCallback((url: string) => {
    void feedbackSelection();
    Linking.openURL(url);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#09090b" }} edges={["top"]}>
      <ScreenHeader title="Settings" />

      <ScrollView
        style={{ flex: 1, backgroundColor: "#09090b" }}
        contentContainerStyle={{ backgroundColor: "#09090b", paddingBottom: 24 }}
      >
        <View className="pt-4">
            <SettingsSection title="Codex Runtime">
              <SettingsRow
                icon={Terminal}
                label="CLI Mode"
                description="Use Codex CLI in terminal"
                trailing={
                  <View
                    className={cn(
                      "w-5 h-5 rounded-full border-2 items-center justify-center",
                      runtimeTarget === "cli"
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    )}
                  >
                    {runtimeTarget === "cli" && (
                      <View className="w-2 h-2 rounded-full bg-primary-foreground" />
                    )}
                  </View>
                }
                onPress={() => {
                  if (runtimeTarget !== "cli") {
                    void setRuntimeTarget("cli");
                    void feedbackSelection();
                  }
                }}
              />
              <Separator />
              <SettingsRow
                icon={Monitor}
                label="Desktop App Mode"
                description="Use Codex desktop application"
                trailing={
                  <View
                    className={cn(
                      "w-5 h-5 rounded-full border-2 items-center justify-center",
                      runtimeTarget === "desktop"
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    )}
                  >
                    {runtimeTarget === "desktop" && (
                      <View className="w-2 h-2 rounded-full bg-primary-foreground" />
                    )}
                  </View>
                }
                onPress={() => {
                  if (runtimeTarget !== "desktop") {
                    void setRuntimeTarget("desktop");
                    void feedbackSelection();
                  }
                }}
              />
            </SettingsSection>

            <SettingsSection title="Connection">
              <SettingsRow
                icon={Laptop}
                label="Connected Mac"
                value={pairing.macName || "Not connected"}
              />
              <Separator />
              <SettingsRow
                icon={Zap}
                label="Bridge Status"
                description={bridgeStatus}
                trailing={
                  <StatusBadge
                    variant={getConnectionStateVariant(connectionState)}
                    label={getConnectionStateLabel(connectionState)}
                  />
                }
              />
              <Separator />
              <SettingsRow
                icon={Shield}
                label="Codex Account"
                trailing={
                  <StatusBadge
                    variant={codexAccount?.isAuthenticated ? "success" : "warning"}
                    label={codexAccount?.isAuthenticated ? "Signed in" : "Not signed in"}
                  />
                }
              />
            </SettingsSection>

            <SettingsSection title="Resources">
              <SettingsRow
                icon={FileText}
                label="Documentation"
                onPress={() => openLink(offdexDocsUrl)}
              />
              <Separator />
              <SettingsRow
                icon={ExternalLink}
                label="GitHub"
                onPress={() => openLink(offdexRepositoryUrl)}
              />
              <Separator />
              <SettingsRow
                icon={Bug}
                label="Report an Issue"
                onPress={() => openLink(offdexIssuesUrl)}
              />
              <Separator />
              <SettingsRow
                icon={MessageCircle}
                label="Send Feedback"
                onPress={() => openLink(offdexFeedbackUrl)}
              />
            </SettingsSection>

            <SettingsSection title="Data">
              <SettingsRow
                icon={Trash2}
                label="Clear All Data"
                description="Disconnect and reset the app"
                variant="destructive"
                onPress={handleClearData}
              />
            </SettingsSection>

            <View className="items-center py-8">
              <Text className="text-sm font-semibold text-foreground mb-1">
                Offdex
              </Text>
              <Text className="text-xs text-muted-foreground">
                Version {appVersion} ({appBuildNumber})
              </Text>
              <Text className="text-xs text-muted-foreground mt-1">
                Made with love for Codex
              </Text>
            </View>
        </View>
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
                This will disconnect from your Mac and clear all local data. You&apos;ll need to
                pair again.
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
