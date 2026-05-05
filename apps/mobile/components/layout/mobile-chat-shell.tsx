import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Keyboard, Platform } from "react-native";
import type { ScrollView as NativeScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { OFFDEX_NEW_THREAD_ID, type OffdexMessage, type OffdexThread } from "@offdex/protocol";

import {
  Archive,
  ChevronLeft,
  Cpu,
  Folder,
  GitCompare,
  Menu,
  MessageSquare,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Settings,
  Shield,
  Terminal,
  Trash2,
  Wifi,
  WifiOff,
} from "../../lib/icons";
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, View } from "../../lib/tw";
import { cn } from "../../lib/utils";
import { useWorkspaceStore } from "../../lib/store";
import { feedbackError, feedbackSelection, feedbackSuccess, feedbackWarning } from "../../src/feedback";
import { Button } from "../ui/button";
import { Composer } from "../chat/composer";

type ThreadGroup = {
  name: string;
  threads: OffdexThread[];
};

function stateLabel(connectionState: "idle" | "connecting" | "live" | "degraded") {
  if (connectionState === "live") return "Live";
  if (connectionState === "connecting") return "Connecting";
  if (connectionState === "degraded") return "Recovering";
  return "Offline";
}

function groupThreads(threads: OffdexThread[], fallbackProject: string): ThreadGroup[] {
  const groups = threads.reduce<ThreadGroup[]>((nextGroups, thread) => {
    const name = thread.projectLabel || fallbackProject;
    const existing = nextGroups.find((group) => group.name === name);
    if (existing) {
      existing.threads.push(thread);
      return nextGroups;
    }
    return [...nextGroups, { name, threads: [thread] }];
  }, []);

  return groups.length > 0 ? groups : [{ name: fallbackProject, threads: [] }];
}

function MessageCard({ message }: { message: OffdexMessage }) {
  const isUser = message.role === "user";
  const label = isUser ? "You" : message.role === "assistant" ? "Codex" : "System";

  return (
    <View className={cn("mb-3 px-4", isUser ? "items-end" : "items-start")}>
      <View
        className={cn(
          "max-w-[86%] rounded-lg px-4 py-3",
          isUser ? "bg-foreground" : "bg-card shadow-card"
        )}
      >
        <Text
          className={cn(
            "font-mono text-[10px] uppercase",
            isUser ? "text-background/60" : "text-muted-foreground"
          )}
        >
          {label}
        </Text>
        <Text
          className={cn("mt-2 text-sm leading-6", isUser ? "text-background" : "text-foreground")}
          selectable
        >
          {message.body}
        </Text>
      </View>
    </View>
  );
}

export function MobileChatShell() {
  const router = useRouter();
  const transcriptRef = useRef<NativeScrollView>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const snapshot = useWorkspaceStore((s) => s.snapshot);
  const threads = useWorkspaceStore((s) => s.snapshot.threads);
  const selectedThreadId = useWorkspaceStore((s) => s.selectedThreadId);
  const activeThread = useWorkspaceStore((s) => s.activeThread);
  const connectionState = useWorkspaceStore((s) => s.connectionState);
  const connectionTransport = useWorkspaceStore((s) => s.connectionTransport);
  const runtimeTarget = useWorkspaceStore((s) => s.runtimeTarget);
  const bridgeStatus = useWorkspaceStore((s) => s.bridgeStatus);
  const isConnected = useWorkspaceStore((s) => s.isConnected);
  const isBusy = useWorkspaceStore((s) => s.isBusy);
  const codexAccount = useWorkspaceStore((s) => s.codexAccount);
  const inventory = useWorkspaceStore((s) => s.inventory);
  const startNewThread = useWorkspaceStore((s) => s.startNewThread);
  const selectThread = useWorkspaceStore((s) => s.selectThread);
  const refresh = useWorkspaceStore((s) => s.refresh);
  const refreshMachines = useWorkspaceStore((s) => s.refreshMachines);
  const refreshInventory = useWorkspaceStore((s) => s.refreshInventory);
  const setRuntimeTarget = useWorkspaceStore((s) => s.setRuntimeTarget);
  const disconnect = useWorkspaceStore((s) => s.disconnect);
  const archiveThread = useWorkspaceStore((s) => s.archiveThread);
  const compactThread = useWorkspaceStore((s) => s.compactThread);
  const rollbackThread = useWorkspaceStore((s) => s.rollbackThread);
  const loadRemoteDiff = useWorkspaceStore((s) => s.loadRemoteDiff);

  const projectName = snapshot.pairing.macName || "offdex";
  const threadGroups = useMemo(() => groupThreads(threads, projectName), [threads, projectName]);
  const messages = activeThread?.messages ?? [];
  const isDraft = activeThread?.id === OFFDEX_NEW_THREAD_ID || selectedThreadId === OFFDEX_NEW_THREAD_ID;
  const canUseThreadActions = !isDraft && isConnected && codexAccount?.isAuthenticated === true;
  const selectedTitle = isDraft ? "New thread" : activeThread?.title ?? "New thread";
  const inventorySummary = inventory
    ? `${inventory.skills.length} skills / ${inventory.plugins.length} plugins / ${inventory.mcpServers.length} connectors`
    : "No runtime inventory loaded";
  const inventoryConfig = inventory?.config?.model
    ? `${inventory.config.model} / ${inventory.config.approvalPolicy ?? "approval default"}`
    : "Runtime config unavailable";
  const primaryLimit = inventory?.rateLimits?.primary?.usedPercent;
  const inventoryLimits =
    typeof primaryLimit === "number"
      ? `${primaryLimit}% primary limit used`
      : "Rate limits unavailable";

  useEffect(() => {
    if (messages.length === 0) return undefined;
    const scrollHandle = setTimeout(() => {
      transcriptRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(scrollHandle);
  }, [activeThread?.id, messages.length]);

  const handleNewThread = useCallback(() => {
    Keyboard.dismiss();
    void feedbackSelection();
    startNewThread();
    setDrawerOpen(false);
  }, [startNewThread]);

  const handleThreadPress = useCallback(
    (thread: OffdexThread) => {
      Keyboard.dismiss();
      void feedbackSelection();
      selectThread(thread.id);
      setDrawerOpen(false);
    },
    [selectThread]
  );

  const handleRefresh = useCallback(async () => {
    void feedbackSelection();
    try {
      await refresh();
      await refreshMachines();
      void feedbackSuccess();
    } catch {
      void feedbackError();
    }
  }, [refresh, refreshMachines]);

  const handleInventoryRefresh = useCallback(async () => {
    void feedbackSelection();
    try {
      await refreshInventory();
      void feedbackSuccess();
    } catch {
      void feedbackError();
    }
  }, [refreshInventory]);

  const handleScan = useCallback(() => {
    void feedbackSelection();
    setDrawerOpen(false);
    setSettingsOpen(false);
    router.push("/pair");
  }, [router]);

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

  const handleClearTrust = useCallback(() => {
    void feedbackWarning();
    Alert.alert(
      "Clear local trust",
      "This will disconnect this phone from the Mac and require pairing again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            disconnect();
            setSettingsOpen(false);
            void feedbackSuccess();
          },
        },
      ]
    );
  }, [disconnect]);

  const handleThreadAction = useCallback(
    (kind: "archive" | "compact" | "rollback") => {
      if (!activeThread || !canUseThreadActions) return;

      const copy = {
        archive: {
          title: "Archive thread",
          detail: "This removes the thread from the active drawer. You can restore it from archived threads later.",
          confirm: "Archive",
          run: () => archiveThread(activeThread.id),
        },
        compact: {
          title: "Compact thread",
          detail: "This asks Codex to compact the current thread context. Long-running work may change shape after compaction.",
          confirm: "Compact",
          run: () => compactThread(activeThread.id),
        },
        rollback: {
          title: "Rollback last turn",
          detail: "This asks Codex to roll back one turn in this thread. Review current work before continuing.",
          confirm: "Rollback",
          run: () => rollbackThread(activeThread.id, 1),
        },
      }[kind];

      void feedbackWarning();
      Alert.alert(copy.title, copy.detail, [
        { text: "Cancel", style: "cancel" },
        {
          text: copy.confirm,
          style: kind === "archive" || kind === "rollback" ? "destructive" : "default",
          onPress: () => {
            copy.run().then(feedbackSuccess).catch(feedbackError);
          },
        },
      ]);
    },
    [activeThread, archiveThread, canUseThreadActions, compactThread, rollbackThread]
  );

  const handleRemoteDiff = useCallback(() => {
    if (!activeThread || !canUseThreadActions) return;

    void feedbackSelection();
    loadRemoteDiff(activeThread.cwd)
      .then((result) => {
        Alert.alert(
          result.diff.trim() ? "Remote diff loaded" : "No remote diff",
          result.diff.trim()
            ? `${result.diff.split("\n").slice(0, 12).join("\n")}`
            : "Codex did not report remote workspace changes for this thread."
        );
        void feedbackSuccess();
      })
      .catch(feedbackError);
  }, [activeThread, canUseThreadActions, loadRemoteDiff]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row items-center justify-between px-3 py-2 shadow-border">
          <Pressable
            onPress={() => {
              void feedbackSelection();
              setDrawerOpen(true);
            }}
            className="h-10 w-10 items-center justify-center rounded-md bg-background shadow-border active:bg-muted"
          >
            <Menu size={20} color="#171717" />
          </Pressable>

          <View className="flex-1 px-3">
            <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
              Offdex
            </Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {projectName} / {stateLabel(connectionState)}
            </Text>
          </View>

          <Pressable
            onPress={() => {
              void feedbackSelection();
              setSettingsOpen(true);
            }}
            className="h-10 w-10 items-center justify-center rounded-md bg-background shadow-border active:bg-muted"
          >
            <Settings size={18} color="#171717" />
          </Pressable>
        </View>

        <ScrollView
          ref={transcriptRef}
          className="flex-1 bg-background"
          contentContainerClassName={cn(
            "min-h-full",
            messages.length > 0 ? "justify-end pb-12" : "justify-center pb-44"
          )}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            if (messages.length > 0) {
              transcriptRef.current?.scrollToEnd({ animated: false });
            }
          }}
        >
          {messages.length > 0 ? (
            <View className="pt-6">
              <View className="mb-4 px-4">
                <Text className="text-2xl font-semibold text-foreground" numberOfLines={2}>
                  {selectedTitle}
                </Text>
                <Text className="mt-2 text-xs text-muted-foreground">
                  {activeThread?.projectLabel ?? projectName}
                </Text>
              </View>
              {messages.map((message) => (
                <MessageCard key={message.id} message={message} />
              ))}
              {canUseThreadActions && (
                <View className="mx-4 mb-4 flex-row gap-2">
                  {([
                    [GitCompare, "Diff", handleRemoteDiff],
                    [Archive, "Archive", () => handleThreadAction("archive")],
                    [RefreshCw, "Compact", () => handleThreadAction("compact")],
                    [RotateCcw, "Rollback", () => handleThreadAction("rollback")],
                  ] as const).map(([Icon, label, onPress]) => (
                    <Pressable
                      key={label}
                      onPress={onPress}
                      disabled={isBusy}
                      className="h-11 flex-1 items-center justify-center rounded-md bg-card shadow-border active:bg-muted"
                    >
                      <Icon size={16} color="#171717" />
                      <Text className="mt-1 text-[10px] font-semibold text-foreground">
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View className="px-4 pb-8">
              <View className="mb-8 items-center">
                <View className="mb-5 h-14 w-14 items-center justify-center rounded-lg bg-card shadow-card">
                  <MessageSquare size={24} color="#171717" />
                </View>
                <Text className="text-center text-3xl font-semibold text-foreground">
                  What do you want Codex to do?
                </Text>
                <Text className="mt-3 max-w-[300px] text-center text-sm leading-6 text-muted-foreground">
                  Start a new thread, or pick a project thread from the sidebar.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <Composer onRequestConnection={() => setSettingsOpen(true)} />
      </KeyboardAvoidingView>

      <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
        <View className="flex-1 flex-row bg-black/20">
          <View
            testID="mobile-shell-drawer"
            className="h-full bg-card px-3 pb-4 pt-12 shadow-card"
            style={{ width: 320, maxWidth: "88%" }}
          >
            <View className="mb-5 flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-semibold text-foreground">Offdex</Text>
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                  {projectName}
                </Text>
              </View>
              <Pressable
                onPress={() => setDrawerOpen(false)}
                className="h-9 w-9 items-center justify-center rounded-md bg-background shadow-border active:bg-muted"
              >
                <ChevronLeft size={18} color="#171717" />
              </Pressable>
            </View>

            <Pressable
              onPress={handleNewThread}
              className="mb-5 flex-row items-center gap-3 rounded-lg bg-background px-3 py-3 shadow-border active:bg-muted"
            >
              <Plus size={18} color="#171717" />
              <Text className="text-sm font-semibold text-foreground">New thread</Text>
            </Pressable>

            <View className="mb-2 flex-row items-center justify-between px-1">
              <Text className="text-sm font-semibold text-muted-foreground">Threads</Text>
              <View className="flex-row items-center gap-3">
                <Pressable onPress={handleRefresh} className="h-8 w-8 items-center justify-center rounded-md active:bg-muted">
                  <RefreshCw size={15} color="#666666" />
                </Pressable>
                <Pressable onPress={handleScan} className="h-8 w-8 items-center justify-center rounded-md active:bg-muted">
                  <QrCode size={15} color="#666666" />
                </Pressable>
              </View>
            </View>

            <ScrollView className="flex-1" contentContainerClassName="pb-4">
              <Text className="px-1 pb-2 font-mono text-[10px] uppercase text-muted-foreground">
                Projects
              </Text>
              {threadGroups.map((group) => (
                <View key={group.name} className="mb-4">
                  <View className="mb-2 flex-row items-center gap-2 px-1">
                    <Folder size={15} color="#666666" />
                    <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                      {group.name}
                    </Text>
                  </View>
                  <View testID="data-mobile-project-threads" className="ml-6 gap-1">
                    {group.threads.length > 0 ? (
                      group.threads.map((thread) => (
                        <Pressable
                          key={thread.id}
                          onPress={() => handleThreadPress(thread)}
                          className={cn(
                            "rounded-lg px-3 py-2 active:bg-muted",
                            thread.id === selectedThreadId ? "bg-muted" : "bg-transparent"
                          )}
                        >
                          <View className="flex-row items-center justify-between gap-3">
                            <Text className="flex-1 text-sm font-semibold text-foreground" numberOfLines={1}>
                              {thread.title}
                            </Text>
                            <Text className="text-xs text-muted-foreground">{thread.updatedAt}</Text>
                          </View>
                        </Pressable>
                      ))
                    ) : (
                      <Text className="px-3 py-2 text-sm text-muted-foreground">
                        No threads yet
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>

            <Pressable
              onPress={() => {
                void feedbackSelection();
                setSettingsOpen(true);
              }}
              className="flex-row items-center gap-3 rounded-lg bg-background px-3 py-3 shadow-border active:bg-muted"
            >
              <Settings size={18} color="#171717" />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">Settings</Text>
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                  {projectName} / {stateLabel(connectionState)}
                </Text>
              </View>
            </Pressable>
          </View>
          <Pressable className="flex-1" onPress={() => setDrawerOpen(false)} />
        </View>
      </Modal>

      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
        <View className="flex-1 justify-end bg-black/25 px-3 pb-3">
          <View className="rounded-lg bg-card p-4 shadow-card">
            <View className="mb-4 flex-row items-start justify-between">
              <View>
                <Text className="text-xl font-semibold text-foreground">Settings</Text>
                <Text className="mt-1 text-sm text-muted-foreground" numberOfLines={2}>
                  {bridgeStatus}
                </Text>
              </View>
              <Pressable
                onPress={() => setSettingsOpen(false)}
                className="h-9 w-9 items-center justify-center rounded-md bg-background shadow-border active:bg-muted"
              >
                <ChevronLeft size={18} color="#171717" />
              </Pressable>
            </View>

            <View className="mb-3 flex-row gap-2">
              {([
                [isConnected ? Wifi : WifiOff, "State", stateLabel(connectionState)],
                [Terminal, "Runtime", runtimeTarget],
                [Cpu, "Path", connectionTransport ?? "none"],
              ] as const).map(([Icon, label, value]) => (
                <View key={label} className="flex-1 rounded-lg bg-background p-3 shadow-border">
                  <Icon size={16} color="#666666" />
                  <Text className="mt-3 font-mono text-[10px] uppercase text-muted-foreground">
                    {label}
                  </Text>
                  <Text className="mt-1 text-xs font-semibold capitalize text-foreground" numberOfLines={1}>
                    {value}
                  </Text>
                </View>
              ))}
            </View>

            <View className="mb-3 rounded-lg bg-background p-3 shadow-border">
              <View className="flex-row items-center gap-2">
                <Cpu size={16} color="#666666" />
                <Text className="font-mono text-[10px] uppercase text-muted-foreground">
                  Runtime inventory
                </Text>
              </View>
              <Text className="mt-2 text-sm font-semibold text-foreground" numberOfLines={2}>
                {inventorySummary}
              </Text>
              <Text className="mt-1 text-xs leading-5 text-muted-foreground" numberOfLines={2}>
                {inventoryConfig} / {inventoryLimits}
              </Text>
            </View>

            <View className="gap-2">
              <Button onPress={handleScan} variant="primary">
                <QrCode size={18} color="#ffffff" />
                <Text className="ml-2 text-sm font-semibold text-primary-foreground">
                  Scan pairing QR
                </Text>
              </Button>

              <View className="flex-row gap-2">
                {(["cli", "desktop"] as const).map((target) => (
                  <Pressable
                    key={target}
                    onPress={() => void handleRuntimeTarget(target)}
                    className={cn(
                      "flex-1 rounded-lg px-4 py-3 active:bg-muted",
                      runtimeTarget === target ? "bg-foreground" : "bg-background shadow-border"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-center text-sm font-semibold capitalize",
                        runtimeTarget === target ? "text-background" : "text-foreground"
                      )}
                    >
                      {target}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={handleRefresh}
                disabled={isBusy}
                className="flex-row items-center gap-3 rounded-lg bg-background px-4 py-3 shadow-border active:bg-muted"
              >
                <RefreshCw size={17} color="#171717" />
                <Text className="flex-1 text-sm font-semibold text-foreground">
                  Refresh bridge
                </Text>
              </Pressable>

              <Pressable
                onPress={handleInventoryRefresh}
                disabled={isBusy || !isConnected}
                className="flex-row items-center gap-3 rounded-lg bg-background px-4 py-3 shadow-border active:bg-muted disabled:opacity-50"
              >
                <RefreshCw size={17} color="#171717" />
                <Text className="flex-1 text-sm font-semibold text-foreground">
                  Refresh runtime inventory
                </Text>
              </Pressable>

              <Pressable
                onPress={handleClearTrust}
                className="flex-row items-center gap-3 rounded-lg bg-[#fff1f0] px-4 py-3 active:opacity-80"
              >
                <Trash2 size={17} color="#ff5b4f" />
                <Text className="flex-1 text-sm font-semibold text-destructive">
                  Clear local trust
                </Text>
              </Pressable>

              <View className="flex-row items-center gap-2 px-1 pt-1">
                <Shield size={14} color="#666666" />
                <Text className="flex-1 text-xs leading-5 text-muted-foreground">
                  {codexAccount?.isAuthenticated
                    ? "Codex is signed in on the Mac."
                    : "Sign in to Codex on the Mac before sending prompts."}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
