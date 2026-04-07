import { useCallback } from "react";
import { RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, MessageSquare } from "../../lib/icons";
import { OFFDEX_NEW_THREAD_ID, type OffdexThread } from "@offdex/protocol";

import { View, Text } from "../../lib/tw";
import { cn } from "../../lib/utils";
import { useWorkspaceStore } from "../../lib/store";
import { feedbackError, feedbackSuccess, feedbackSelection } from "../../src/feedback";

import { Button } from "../../components/ui/button";
import { ScreenHeader } from "../../components/layout/header";
import { ConnectionBanner, ConnectionStatus } from "../../components/layout/connection-banner";
import { EmptyState, SectionHeader } from "../../components/layout/empty-state";
import { ThreadItem, NewThreadCard } from "../../components/chat/thread-item";

// ════════════════════════════════════════════════════════════════════════════
// Thread List Screen
// ════════════════════════════════════════════════════════════════════════════

export default function ThreadListScreen() {
  const router = useRouter();
  
  // Store state
  const threads = useWorkspaceStore((s) => s.snapshot.threads);
  const selectedThreadId = useWorkspaceStore((s) => s.selectedThreadId);
  const isConnected = useWorkspaceStore((s) => s.isConnected);
  const isAwaitingNewThread = useWorkspaceStore((s) => s.isAwaitingNewThread);
  const isBusy = useWorkspaceStore((s) => s.isBusy);
  const connectionState = useWorkspaceStore((s) => s.connectionState);
  
  // Actions
  const selectThread = useWorkspaceStore((s) => s.selectThread);
  const startNewThread = useWorkspaceStore((s) => s.startNewThread);
  const refresh = useWorkspaceStore((s) => s.refresh);

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

  const handleThreadPress = useCallback((thread: OffdexThread) => {
    void feedbackSelection();
    selectThread(thread.id);
    router.push(`/chat/${thread.id}`);
  }, [selectThread, router]);

  const isDraftSelected = selectedThreadId === OFFDEX_NEW_THREAD_ID;
  const showThreads = threads.length > 0 || connectionState !== "idle";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#09090b" }} edges={["top"]}>
      {/* Header */}
      <ScreenHeader
        title="Chats"
        rightAction={
          <View className="flex-row items-center gap-3">
            <ConnectionStatus />
            <Button
              size="icon"
              variant="secondary"
              onPress={handleNewThread}
            >
              <Plus size={20} color="#fafafa" strokeWidth={2} />
            </Button>
          </View>
        }
      />

      {/* Connection Banner */}
      <ConnectionBanner />

      {/* Thread List */}
      {showThreads ? (
        <FlashList
          data={threads}
          keyExtractor={(thread) => thread.id}
          style={{ flex: 1, backgroundColor: "#09090b" }}
          contentContainerStyle={{ paddingBottom: 16, backgroundColor: "#09090b" }}
          refreshControl={
            <RefreshControl
              refreshing={isBusy}
              onRefresh={handleRefresh}
              tintColor="#fafafa"
              colors={["#fafafa"]}
            />
          }
          ListHeaderComponent={
            <View className="gap-3 pb-2">
              {/* New Thread Card */}
              <NewThreadCard
                isActive={isDraftSelected}
                isAwaiting={isAwaitingNewThread}
                onPress={handleNewThread}
              />
              
              {/* Section Header */}
              {threads.length > 0 && (
                <SectionHeader title="Recent" className="mt-2" />
              )}
            </View>
          }
          renderItem={({ item: thread }) => (
            <ThreadItem
              thread={thread}
              isActive={thread.id === selectedThreadId}
              isConnected={isConnected}
              onPress={() => handleThreadPress(thread)}
            />
          )}
          ItemSeparatorComponent={() => <View className="h-1" />}
          ListEmptyComponent={
            isConnected ? (
              <View className="px-4 py-8">
                <View className="rounded-xl bg-card border border-border p-4">
                  <Text className="text-sm text-muted-foreground text-center">
                    No threads yet. Start a new conversation to get going.
                  </Text>
                </View>
              </View>
            ) : null
          }
        />
      ) : (
        <FlashList
          data={[]}
          keyExtractor={(_, index) => `empty-${index}`}
          renderItem={null}
          style={{ flex: 1, backgroundColor: "#09090b" }}
          contentContainerStyle={{ flexGrow: 1, backgroundColor: "#09090b" }}
          refreshControl={
            <RefreshControl
              refreshing={isBusy}
              onRefresh={handleRefresh}
              tintColor="#fafafa"
              colors={["#fafafa"]}
            />
          }
          ListEmptyComponent={
            <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description="Connect to your Mac to see your Codex threads, or start a new one."
            action={{
              label: "Start new chat",
              onPress: handleNewThread,
            }}
          />
          }
        />
      )}
    </SafeAreaView>
  );
}
