import { useCallback, useEffect } from "react";
import { RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import {
  Monitor,
  Terminal,
  QrCode,
  Wifi,
  WifiOff,
  Check,
  ChevronRight,
  RefreshCw,
  Laptop,
  Globe,
} from "../../lib/icons";
import type { OffdexMachineRecord } from "@offdex/protocol";

import { View, Text, Pressable } from "../../lib/tw";
import { cn, formatRelativeTime } from "../../lib/utils";
import { useWorkspaceStore } from "../../lib/store";
import { feedbackSelection, feedbackSuccess, feedbackError } from "../../src/feedback";

import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { StatusBadge } from "../../components/ui/badge";
import { ScreenHeader } from "../../components/layout/header";
import { EmptyState, SectionHeader } from "../../components/layout/empty-state";
import { Separator } from "../../components/ui/separator";

// ════════════════════════════════════════════════════════════════════════════
// Machine Item Component
// ════════════════════════════════════════════════════════════════════════════

interface MachineItemProps {
  machine: OffdexMachineRecord;
  isActive: boolean;
  isConnecting: boolean;
  onPress: () => void;
}

function MachineItem({ machine, isActive, isConnecting, onPress }: MachineItemProps) {
  const RuntimeIcon = machine.runtimeTarget === "cli" ? Terminal : Monitor;

  return (
    <Pressable
      onPress={onPress}
      disabled={isConnecting}
      className={cn(
        "mx-4 rounded-xl bg-card border px-4 py-3.5",
        "active:bg-muted",
        isActive ? "border-primary" : "border-border",
        isConnecting && "opacity-50"
      )}
    >
      <View className="flex-row items-center gap-3">
        {/* Machine Icon */}
        <View
          className={cn(
            "w-10 h-10 rounded-lg items-center justify-center",
            machine.online ? "bg-success/10" : "bg-muted"
          )}
        >
          <Laptop size={20} color={machine.online ? "#22c55e" : "#71717a"} />
        </View>

        {/* Machine Info */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
              {machine.macName}
            </Text>
            {isActive && (
              <View className="w-4 h-4 rounded-full bg-primary items-center justify-center">
                <Check size={10} color="#09090b" strokeWidth={3} />
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-2 mt-0.5">
            <View className="flex-row items-center gap-1">
              <RuntimeIcon size={10} color="#71717a" />
              <Text className="text-xs text-muted-foreground capitalize">
                {machine.runtimeTarget}
              </Text>
            </View>
            <Text className="text-xs text-muted-foreground">·</Text>
            <Text className="text-xs text-muted-foreground">
              {formatRelativeTime(machine.lastSeenAt)}
            </Text>
          </View>
        </View>

        {/* Status */}
        <View className="items-end gap-1.5">
          <StatusBadge
            variant={machine.online ? "success" : "secondary"}
            label={machine.online ? "Online" : "Offline"}
          />
          {machine.remoteCapability && (
            <View className="flex-row items-center gap-1">
              <Globe size={10} color="#71717a" />
              <Text className="text-[10px] text-muted-foreground">Remote</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Current Connection Card
// ════════════════════════════════════════════════════════════════════════════

function CurrentConnectionCard() {
  const isConnected = useWorkspaceStore((s) => s.isConnected);
  const isConnecting = useWorkspaceStore((s) => s.isConnecting);
  const connectionState = useWorkspaceStore((s) => s.connectionState);
  const connectionTransport = useWorkspaceStore((s) => s.connectionTransport);
  const pairing = useWorkspaceStore((s) => s.snapshot.pairing);
  const codexAccount = useWorkspaceStore((s) => s.codexAccount);
  const runtimeTarget = useWorkspaceStore((s) => s.runtimeTarget);
  const disconnect = useWorkspaceStore((s) => s.disconnect);
  const refresh = useWorkspaceStore((s) => s.refresh);

  const handleDisconnect = useCallback(() => {
    void feedbackSelection();
    disconnect();
  }, [disconnect]);

  const handleReconnect = useCallback(async () => {
    void feedbackSelection();
    try {
      await refresh();
      void feedbackSuccess();
    } catch {
      void feedbackError();
    }
  }, [refresh]);

  if (connectionState === "idle" && !pairing.macName) {
    return null;
  }

  const RuntimeIcon = runtimeTarget === "cli" ? Terminal : Monitor;
  const TransportIcon = connectionTransport === "local" ? Wifi : Globe;

  return (
    <Card className="mx-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Current Connection
        </Text>
        <View
          className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-success" : isConnecting ? "bg-warning" : "bg-muted-foreground"
          )}
        />
      </View>

      {/* Machine Info */}
      <View className="flex-row items-center gap-3">
        <View
          className={cn(
            "w-12 h-12 rounded-xl items-center justify-center",
            isConnected ? "bg-success/10" : "bg-muted"
          )}
        >
          <Laptop size={24} color={isConnected ? "#22c55e" : "#71717a"} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">
            {pairing.macName || "Unknown Mac"}
          </Text>
          <View className="flex-row items-center gap-2 mt-0.5">
            <View className="flex-row items-center gap-1">
              <RuntimeIcon size={12} color="#71717a" />
              <Text className="text-xs text-muted-foreground capitalize">{runtimeTarget}</Text>
            </View>
            {isConnected && connectionTransport && (
              <>
                <Text className="text-xs text-muted-foreground">·</Text>
                <View className="flex-row items-center gap-1">
                  <TransportIcon size={12} color="#71717a" />
                  <Text className="text-xs text-muted-foreground capitalize">
                    {connectionTransport}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Codex Account */}
      {codexAccount && (
        <View className="mt-3 pt-3 border-t border-border">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-muted-foreground">Codex Account</Text>
            <Text
              className={cn(
                "text-xs font-medium",
                codexAccount.isAuthenticated ? "text-success" : "text-warning"
              )}
            >
              {codexAccount.isAuthenticated
                ? codexAccount.email || "Signed in"
                : "Not signed in"}
            </Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View className="flex-row gap-2 mt-4">
        {isConnected ? (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onPress={handleDisconnect}
          >
            <WifiOff size={14} color="#fafafa" />
            <Text className="text-sm font-medium text-secondary-foreground ml-2">
              Disconnect
            </Text>
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onPress={handleReconnect}
            disabled={isConnecting}
          >
            <RefreshCw
              size={14}
              color="#09090b"
              className={cn(isConnecting && "animate-spin")}
            />
            <Text className="text-sm font-medium text-primary-foreground ml-2">
              {isConnecting ? "Connecting..." : "Reconnect"}
            </Text>
          </Button>
        )}
      </View>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Machines Screen
// ════════════════════════════════════════════════════════════════════════════

export default function MachinesScreen() {
  const router = useRouter();

  // Store state
  const machines = useWorkspaceStore((s) => s.machines);
  const isBusy = useWorkspaceStore((s) => s.isBusy);
  const isConnecting = useWorkspaceStore((s) => s.isConnecting);
  const pairing = useWorkspaceStore((s) => s.snapshot.pairing);
  const managedSession = useWorkspaceStore((s) => s.managedSession);

  // Actions
  const refreshMachines = useWorkspaceStore((s) => s.refreshMachines);
  const connectMachine = useWorkspaceStore((s) => s.connectMachine);

  // Refresh machines on mount
  useEffect(() => {
    void refreshMachines().catch(() => {
      void feedbackError();
    });
  }, [refreshMachines]);

  const handleRefresh = useCallback(async () => {
    try {
      await refreshMachines();
      void feedbackSuccess();
    } catch {
      void feedbackError();
    }
  }, [refreshMachines]);

  const handleMachinePress = useCallback(
    async (machine: OffdexMachineRecord) => {
      void feedbackSelection();
      if (!machine.online) return;
      try {
        await connectMachine(machine.machineId);
        void feedbackSuccess();
        router.push("/(tabs)");
      } catch {
        void feedbackError();
      }
    },
    [connectMachine, router]
  );

  const handleScanQR = useCallback(() => {
    void feedbackSelection();
    router.push("/pair");
  }, [router]);

  const activeMachineId = managedSession?.machineId;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#09090b" }} edges={["top"]}>
      <ScreenHeader
        title="Machines"
        rightAction={
          <Button size="icon" variant="secondary" onPress={handleScanQR}>
            <QrCode size={20} color="#fafafa" />
          </Button>
        }
      />

      <FlashList
        data={machines}
        keyExtractor={(machine) => machine.machineId}
        style={{ flex: 1, backgroundColor: "#09090b" }}
        contentContainerStyle={{ backgroundColor: "#09090b", paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isBusy}
            onRefresh={handleRefresh}
            tintColor="#fafafa"
            colors={["#fafafa"]}
          />
        }
        ListHeaderComponent={
          <View>
            <CurrentConnectionCard />
            <Separator className="my-4" />
            <SectionHeader
              title="Available Machines"
              action={
                <Pressable
                  onPress={handleRefresh}
                  className="flex-row items-center gap-1.5 py-1 px-2 rounded-md active:bg-muted"
                >
                  <RefreshCw
                    size={12}
                    color="#71717a"
                    className={cn(isBusy && "animate-spin")}
                  />
                  <Text className="text-xs text-muted-foreground">Refresh</Text>
                </Pressable>
              }
            />
          </View>
        }
        ListEmptyComponent={
          <View className="px-4 py-8">
            <EmptyState
              icon={Laptop}
              title="No machines found"
              description="Sign in to your Codex account to see your available machines, or scan a QR code to trust this device."
              action={{
                label: "Scan QR Code",
                onPress: handleScanQR,
              }}
            />
          </View>
        }
        ListFooterComponent={
          <View className="px-4 py-6">
            <Card className="bg-muted/30">
              <View className="flex-row items-start gap-3">
                <QrCode size={20} color="#71717a" className="mt-0.5" />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground mb-1">
                    Connect via QR Code
                  </Text>
                  <Text className="text-xs text-muted-foreground leading-relaxed">
                    Run <Text className="font-mono bg-muted px-1 rounded">offdex start</Text> on your Mac to display a pairing QR code, then scan it with this app.
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        }
        renderItem={({ item: machine }) => (
          <MachineItem
            machine={machine}
            isActive={machine.machineId === activeMachineId}
            isConnecting={isConnecting}
            onPress={() => handleMachinePress(machine)}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-2" />}
      />
    </SafeAreaView>
  );
}
