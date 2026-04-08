import { useCallback } from "react";
import { RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  MessageSquare,
  Plus,
  RefreshCw,
  Terminal,
  Wifi,
  WifiOff,
} from "../../lib/icons";
import { OFFDEX_NEW_THREAD_ID, type OffdexThread } from "@offdex/protocol";

import { Pressable, Text, View } from "../../lib/tw";
import { cn } from "../../lib/utils";
import { useWorkspaceStore } from "../../lib/store";
import { feedbackError, feedbackSelection, feedbackSuccess } from "../../src/feedback";
import { Button } from "../../components/ui/button";

function statusCopy(connectionState: "idle" | "connecting" | "live" | "degraded") {
  if (connectionState === "live") return ["Live", "bg-accent text-accent-foreground"] as const;
  if (connectionState === "connecting") return ["Connecting", "bg-[#fdf2f8] text-preview"] as const;
  if (connectionState === "degraded") return ["Recovering", "bg-[#fdf2f8] text-preview"] as const;
  return ["Offline", "bg-muted text-muted-foreground"] as const;
}

export default function ThreadListScreen() {
  const router = useRouter();
  const threads = useWorkspaceStore((s) => s.snapshot.threads);
  const selectedThreadId = useWorkspaceStore((s) => s.selectedThreadId);
  const isConnected = useWorkspaceStore((s) => s.isConnected);
  const isAwaitingNewThread = useWorkspaceStore((s) => s.isAwaitingNewThread);
  const isBusy = useWorkspaceStore((s) => s.isBusy);
  const connectionState = useWorkspaceStore((s) => s.connectionState);
  const runtimeTarget = useWorkspaceStore((s) => s.runtimeTarget);
  const pairing = useWorkspaceStore((s) => s.snapshot.pairing);
  const selectThread = useWorkspaceStore((s) => s.selectThread);
  const startNewThread = useWorkspaceStore((s) => s.startNewThread);
  const refresh = useWorkspaceStore((s) => s.refresh);

  const selectedThread =
    threads.find((thread) => thread.id === selectedThreadId) ?? threads[0] ?? null;
  const [statusLabel, statusClassName] = statusCopy(connectionState);

  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
      void feedbackSuccess();
    } catch {
      void feedbackError();
    }
  }, [refresh]);

  const handleNewThread = useCallback(() => {
    void feedbackSelection();
    startNewThread();
    router.push("/chat/new");
  }, [startNewThread, router]);

  const handleThreadPress = useCallback(
    (thread: OffdexThread) => {
      void feedbackSelection();
      selectThread(thread.id);
      router.push(`/chat/${thread.id}`);
    },
    [selectThread, router]
  );

  const handleResume = useCallback(() => {
    void feedbackSelection();
    if (selectedThread) {
      selectThread(selectedThread.id);
      router.push(`/chat/${selectedThread.id}`);
      return;
    }
    startNewThread();
    router.push("/chat/new");
  }, [selectedThread, selectThread, startNewThread, router]);

  const renderThread = ({ item: thread }: { item: OffdexThread }) => (
    <Pressable
      onPress={() => handleThreadPress(thread)}
      className={cn(
        "mx-4 rounded-lg px-4 py-4 active:bg-muted",
        thread.id === selectedThreadId ? "bg-card shadow-card" : "bg-background shadow-border"
      )}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
            {thread.title}
          </Text>
          <Text className="mt-2 text-xs leading-5 text-muted-foreground" numberOfLines={2}>
            {thread.messages[thread.messages.length - 1]?.body ?? "Ready for the next turn."}
          </Text>
        </View>
        {thread.unreadCount > 0 ? (
          <View className="h-6 items-center justify-center rounded-full bg-foreground px-2">
            <Text className="text-xs font-semibold text-background">{thread.unreadCount}</Text>
          </View>
        ) : (
          <Text className="font-mono text-[10px] uppercase text-muted-foreground">
            {thread.runtimeTarget}
          </Text>
        )}
      </View>
      <Text className="mt-3 font-mono text-[10px] uppercase text-muted-foreground">
        {thread.projectLabel} / {thread.updatedAt}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["top"]}>
      <FlashList
        data={threads}
        keyExtractor={(thread) => thread.id}
        renderItem={renderThread}
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
                    Command deck
                  </Text>
                  <Text className="mt-2 text-4xl font-semibold text-foreground">
                    Run
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Pressable
                    onPress={handleRefresh}
                    className="h-10 w-10 items-center justify-center rounded-md bg-background shadow-border active:bg-muted"
                  >
                    <RefreshCw size={18} color="#171717" className={cn(isBusy && "animate-spin")} />
                  </Pressable>
                  <Button size="icon" variant="primary" onPress={handleNewThread}>
                    <Plus size={20} color="#ffffff" strokeWidth={2} />
                  </Button>
                </View>
              </View>
            </View>

            <Pressable
              onPress={handleResume}
              className="mx-4 rounded-lg bg-foreground p-5 active:opacity-90"
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-mono text-xs uppercase text-background/60">
                  Resume active thread
                </Text>
                <Text className={cn("rounded-full px-3 py-1 text-xs font-medium", statusClassName)}>
                  {statusLabel}
                </Text>
              </View>
              <Text className="mt-8 text-2xl font-semibold text-background">
                {selectedThread?.title ?? "Start a new Codex turn"}
              </Text>
              <Text className="mt-3 text-sm leading-6 text-background/60" numberOfLines={2}>
                {selectedThread?.messages[selectedThread.messages.length - 1]?.body ??
                  "The Mac bridge will keep the runtime authority. This screen sends the next instruction."}
              </Text>
            </Pressable>

            <View className="mx-4 mt-3 flex-row gap-2">
              {[
                ["Mac", pairing.macName || "Unpaired"],
                ["Runtime", runtimeTarget],
                ["Threads", String(threads.length)],
              ].map(([label, value]) => (
                <View className="flex-1 rounded-lg bg-card px-3 py-4 shadow-card" key={label}>
                  <Text className="font-mono text-[10px] uppercase text-muted-foreground">
                    {label}
                  </Text>
                  <Text className="mt-2 text-sm font-semibold text-foreground" numberOfLines={1}>
                    {value}
                  </Text>
                </View>
              ))}
            </View>

            <View className="mx-4 mt-3 rounded-lg bg-card p-4 shadow-card">
              <View className="flex-row items-start gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-lg bg-muted shadow-border">
                  {isConnected ? (
                    <Wifi size={18} color="#0a72ef" />
                  ) : (
                    <WifiOff size={18} color="#666666" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">
                    {isConnected ? "Bridge stream active" : "Bridge stream waiting"}
                  </Text>
                  <Text className="mt-1 text-xs leading-5 text-muted-foreground">
                    {isAwaitingNewThread
                      ? "New thread is staged. Send the first turn from the composer."
                      : "Pull to refresh, or use Trust to pair a Mac before sending turns."}
                  </Text>
                </View>
              </View>
            </View>

            {threads.length > 0 ? (
              <Text className="px-4 pt-6 font-mono text-xs uppercase text-muted-foreground">
                Recent work
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View className="mx-4 mt-4 rounded-lg bg-card p-6 shadow-card">
            <MessageSquare size={24} color="#666666" />
            <Text className="mt-5 text-xl font-semibold text-foreground">
              No turns yet
            </Text>
            <Text className="mt-2 text-sm leading-6 text-muted-foreground">
              Pair a Mac or start a new turn. The bridge stays the source of truth.
            </Text>
            <Button className="mt-5" onPress={handleNewThread}>
              New turn
            </Button>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-2" />}
      />
    </SafeAreaView>
  );
}
