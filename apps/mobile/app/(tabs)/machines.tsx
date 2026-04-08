import { useCallback, useEffect } from "react";
import { RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Check,
  Globe,
  Laptop,
  Monitor,
  QrCode,
  RefreshCw,
  Shield,
  Terminal,
} from "../../lib/icons";
import type { OffdexMachineRecord } from "@offdex/protocol";

import { Pressable, Text, View } from "../../lib/tw";
import { cn, formatRelativeTime } from "../../lib/utils";
import { useWorkspaceStore } from "../../lib/store";
import { feedbackError, feedbackSelection, feedbackSuccess } from "../../src/feedback";
import { Button } from "../../components/ui/button";

export default function MachinesScreen() {
  const router = useRouter();
  const machines = useWorkspaceStore((s) => s.machines);
  const isBusy = useWorkspaceStore((s) => s.isBusy);
  const isConnecting = useWorkspaceStore((s) => s.isConnecting);
  const pairing = useWorkspaceStore((s) => s.snapshot.pairing);
  const managedSession = useWorkspaceStore((s) => s.managedSession);
  const connectionState = useWorkspaceStore((s) => s.connectionState);
  const runtimeTarget = useWorkspaceStore((s) => s.runtimeTarget);
  const connectionTransport = useWorkspaceStore((s) => s.connectionTransport);
  const refreshMachines = useWorkspaceStore((s) => s.refreshMachines);
  const connectMachine = useWorkspaceStore((s) => s.connectMachine);

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

  const handleScanQR = useCallback(() => {
    void feedbackSelection();
    router.push("/pair");
  }, [router]);

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

  const activeMachineId = managedSession?.machineId;

  const renderMachine = ({ item: machine }: { item: OffdexMachineRecord }) => {
    const RuntimeIcon = machine.runtimeTarget === "cli" ? Terminal : Monitor;
    const isActive = machine.machineId === activeMachineId;

    return (
      <Pressable
        onPress={() => handleMachinePress(machine)}
        disabled={isConnecting || !machine.online}
        className={cn(
          "mx-4 rounded-lg p-4 active:bg-muted",
          isActive ? "bg-foreground" : "bg-card shadow-card",
          (!machine.online || isConnecting) && "opacity-60"
        )}
      >
        <View className="flex-row items-start justify-between gap-4">
          <View
            className={cn(
              "h-12 w-12 items-center justify-center rounded-lg",
              isActive ? "bg-background" : "bg-muted shadow-border"
            )}
          >
            <Laptop size={22} color={isActive ? "#171717" : machine.online ? "#0a72ef" : "#666666"} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text
                className={cn("text-base font-semibold", isActive ? "text-background" : "text-foreground")}
                numberOfLines={1}
              >
                {machine.macName}
              </Text>
              {isActive ? (
                <View className="h-5 w-5 items-center justify-center rounded-full bg-background">
                  <Check size={12} color="#171717" strokeWidth={3} />
                </View>
              ) : null}
            </View>
            <View className="mt-2 flex-row items-center gap-2">
              <RuntimeIcon size={12} color={isActive ? "#ffffff" : "#666666"} />
              <Text className={cn("text-xs capitalize", isActive ? "text-background/60" : "text-muted-foreground")}>
                {machine.runtimeTarget}
              </Text>
              <Text className={cn("text-xs", isActive ? "text-background/60" : "text-muted-foreground")}>
                /
              </Text>
              <Text className={cn("text-xs", isActive ? "text-background/60" : "text-muted-foreground")}>
                {formatRelativeTime(machine.lastSeenAt)}
              </Text>
            </View>
          </View>
          <View className="items-end gap-2">
            <Text
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                isActive
                  ? "bg-background text-foreground"
                  : machine.online
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {machine.online ? "Online" : "Offline"}
            </Text>
            {machine.remoteCapability ? (
              <View className="flex-row items-center gap-1">
                <Globe size={10} color={isActive ? "#ffffff" : "#666666"} />
                <Text className={cn("text-[10px]", isActive ? "text-background/60" : "text-muted-foreground")}>
                  Remote
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["top"]}>
      <FlashList
        data={machines}
        keyExtractor={(machine) => machine.machineId}
        renderItem={renderMachine}
        style={{ flex: 1, backgroundColor: "#ffffff" }}
        contentContainerStyle={{ backgroundColor: "#ffffff", paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isBusy}
            onRefresh={handleRefresh}
            tintColor="#171717"
            colors={["#171717"]}
          />
        }
        ListHeaderComponent={
          <View className="pb-4">
            <View className="px-4 pb-4 pt-3">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-mono text-xs uppercase text-muted-foreground">
                    Trust center
                  </Text>
                  <Text className="mt-2 text-4xl font-semibold text-foreground">
                    Trust
                  </Text>
                </View>
                <Button size="icon" variant="primary" onPress={handleScanQR}>
                  <QrCode size={20} color="#ffffff" />
                </Button>
              </View>
            </View>

            <View className="mx-4 rounded-lg bg-foreground p-5">
              <Text className="font-mono text-xs uppercase text-background/60">
                Active machine
              </Text>
              <Text className="mt-8 text-2xl font-semibold text-background">
                {pairing.macName || "Pair a new machine"}
              </Text>
              <View className="mt-4 flex-row gap-2">
                {[
                  ["State", connectionState],
                  ["Runtime", runtimeTarget],
                  ["Path", connectionTransport ?? "none"],
                ].map(([label, value]) => (
                  <View className="flex-1 rounded-md bg-background px-3 py-3" key={label}>
                    <Text className="font-mono text-[10px] uppercase text-muted-foreground">
                      {label}
                    </Text>
                    <Text className="mt-1 text-xs font-semibold capitalize text-foreground">
                      {value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View className="mx-4 mt-3 rounded-lg bg-card p-4 shadow-card">
              <View className="flex-row items-start gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-lg bg-muted shadow-border">
                  <Shield size={18} color="#171717" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">
                    Pair a new machine
                  </Text>
                  <Text className="mt-1 text-xs leading-5 text-muted-foreground">
                    Run offdex start on the Mac, scan the QR code, then this device can reconnect without rescanning.
                  </Text>
                </View>
                <Pressable
                  onPress={handleRefresh}
                  className="h-9 w-9 items-center justify-center rounded-md bg-background shadow-border active:bg-muted"
                >
                  <RefreshCw size={16} color="#171717" className={cn(isBusy && "animate-spin")} />
                </Pressable>
              </View>
            </View>

            {machines.length > 0 ? (
              <Text className="px-4 pt-6 font-mono text-xs uppercase text-muted-foreground">
                Known machines
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View className="mx-4 mt-4 rounded-lg bg-card p-6 shadow-card">
            <Laptop size={24} color="#666666" />
            <Text className="mt-5 text-xl font-semibold text-foreground">
              No trusted machines
            </Text>
            <Text className="mt-2 text-sm leading-6 text-muted-foreground">
              Scan the QR code from your Mac to create the first trust record.
            </Text>
            <Button className="mt-5" onPress={handleScanQR}>
              Scan QR
            </Button>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-2" />}
      />
    </SafeAreaView>
  );
}
