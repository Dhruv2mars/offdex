import { useCallback, useRef, useEffect, useState } from "react";
import { Platform, Keyboard } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Folder,
  Terminal,
  Monitor,
} from "../../lib/icons";
import { OFFDEX_NEW_THREAD_ID, type OffdexMessage } from "@offdex/protocol";

import { View, Text, Pressable, KeyboardAvoidingView } from "../../lib/tw";
import { cn } from "../../lib/utils";
import { useWorkspaceStore } from "../../lib/store";
import { feedbackSelection } from "../../src/feedback";

import { WorkingIndicator } from "../../components/chat/message-bubble";
import { Composer } from "../../components/chat/composer";

// ════════════════════════════════════════════════════════════════════════════
// Chat View Screen
// ════════════════════════════════════════════════════════════════════════════

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const listRef = useRef<FlashListRef<OffdexMessage>>(null);
  const [workingDuration, setWorkingDuration] = useState(0);

  // Store state
  const threads = useWorkspaceStore((s) => s.snapshot.threads);
  const activeThread = useWorkspaceStore((s) => s.activeThread);
  const selectedThreadId = useWorkspaceStore((s) => s.selectedThreadId);
  const isConnected = useWorkspaceStore((s) => s.isConnected);
  const runtimeTarget = useWorkspaceStore((s) => s.runtimeTarget);

  // Actions
  const selectThread = useWorkspaceStore((s) => s.selectThread);

  // Select thread on mount
  useEffect(() => {
    if (id && id !== selectedThreadId) {
      if (id === "new") {
        selectThread(OFFDEX_NEW_THREAD_ID);
      } else {
        selectThread(id);
      }
    }
  }, [id, selectedThreadId, selectThread]);

  // Get the current thread
  const thread = id === "new" 
    ? activeThread 
    : threads.find((t) => t.id === id) ?? activeThread;

  const messages = thread?.messages ?? [];
  const isRunning = thread?.state === "running";
  const isNewThread = id === "new" || thread?.id === OFFDEX_NEW_THREAD_ID;

  // Working duration timer
  useEffect(() => {
    if (!isRunning) {
      setWorkingDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setWorkingDuration((d) => d + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleBack = useCallback(() => {
    void feedbackSelection();
    router.back();
  }, [router]);

  // Get runtime target icon
  const RuntimeIcon = runtimeTarget === "cli" ? Terminal : Monitor;
  const renderMessage = ({ item: message }: { item: OffdexMessage }) => {
    const isUser = message.role === "user";
    const label = isUser ? "You" : message.role === "assistant" ? "Codex" : "System";

    return (
      <View className="px-4">
        <View
          className={cn(
            "rounded-lg px-4 py-4",
            isUser ? "bg-foreground" : "bg-card shadow-card"
          )}
        >
          <View className="flex-row items-center justify-between gap-3">
            <Text
              className={cn(
                "font-mono text-[10px] uppercase",
                isUser ? "text-background/60" : "text-muted-foreground"
              )}
            >
              {label}
            </Text>
            <Text
              className={cn(
                "text-[10px]",
                isUser ? "text-background/45" : "text-muted-foreground"
              )}
            >
              {message.createdAt}
            </Text>
          </View>
          <Text
            className={cn(
              "mt-3 text-sm leading-6",
              isUser ? "text-background" : "text-foreground"
            )}
            selectable
          >
            {message.body}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["top"]}>
      <View className="px-4 pb-3 pt-2 shadow-border">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={handleBack}
            className="h-10 w-10 items-center justify-center rounded-md bg-background shadow-border active:bg-muted"
          >
            <ChevronLeft size={22} color="#171717" />
          </Pressable>
          <View className="flex-row items-center gap-1.5 rounded-md bg-card px-3 py-2 shadow-border">
            <RuntimeIcon size={12} color="#4d4d4d" />
            <Text className="text-xs capitalize text-muted-foreground">
              {runtimeTarget}
            </Text>
          </View>
        </View>

        <View className="mt-4 rounded-lg bg-foreground p-5">
          <Text className="font-mono text-xs uppercase text-background/60">
            Run thread
          </Text>
          <Text className="mt-8 text-2xl font-semibold text-background" numberOfLines={2}>
            {isNewThread ? "New Codex turn" : thread?.title ?? "Codex turn"}
          </Text>
          {thread?.projectLabel ? (
            <View className="mt-3 flex-row items-center gap-2">
              <Folder size={12} color="#ffffff" />
              <Text className="text-xs text-background/60" numberOfLines={1}>
                {thread.projectLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlashList
          ref={listRef}
          data={messages}
          keyExtractor={(message) => message.id}
          style={{ flex: 1, backgroundColor: "#ffffff" }}
          contentContainerStyle={{ paddingVertical: 16, backgroundColor: "#ffffff" }}
          ListEmptyComponent={
            <View className="mx-4 rounded-lg bg-card p-6 shadow-card">
              {isNewThread ? (
                <>
                  <View className="mb-5 h-14 w-14 items-center justify-center rounded-lg bg-muted shadow-border">
                    <RuntimeIcon size={24} color="#4d4d4d" />
                  </View>
                  <Text className="text-xl font-semibold text-foreground">
                    Start from a blank turn
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-muted-foreground">
                    The composer below sends the first instruction to the Mac bridge.
                  </Text>
                </>
              ) : (
                <Text className="text-sm text-muted-foreground">
                  No messages in this thread yet.
                </Text>
              )}
            </View>
          }
          ListFooterComponent={
            isRunning ? (
              <WorkingIndicator duration={workingDuration} />
            ) : null
          }
          renderItem={renderMessage}
          ItemSeparatorComponent={() => <View className="h-2" />}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              listRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />

        <Composer />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
