import { useCallback, useRef, useEffect, useState } from "react";
import { Platform, Keyboard } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  MoreHorizontal,
  Folder,
  Terminal,
  Monitor,
} from "../../lib/icons";
import { OFFDEX_NEW_THREAD_ID, type OffdexMessage } from "@offdex/protocol";

import { View, Text, Pressable, KeyboardAvoidingView } from "../../lib/tw";
import { cn } from "../../lib/utils";
import { useWorkspaceStore } from "../../lib/store";
import { feedbackSelection } from "../../src/feedback";

import { MessageBubble, WorkingIndicator, SystemMessage } from "../../components/chat/message-bubble";
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["top"]}>
      {/* Custom Header */}
      <View className="flex-row items-center justify-between px-4 py-3 shadow-border">
        {/* Back Button */}
        <Pressable
          onPress={handleBack}
          className="flex-row items-center -ml-2 py-1 pl-1 pr-3 rounded-lg active:bg-muted"
        >
          <ChevronLeft size={24} color="#171717" />
          <Text className="text-base font-medium text-foreground ml-1">
            Chats
          </Text>
        </Pressable>

        {/* Thread Info */}
        <View className="flex-1 items-center mx-4">
          <Text
            className="text-sm font-semibold text-foreground"
            numberOfLines={1}
          >
            {isNewThread ? "New Chat" : (thread?.title ?? "Chat")}
          </Text>
          {thread?.projectLabel && (
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <Folder size={10} color="#666666" />
              <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                {thread.projectLabel}
              </Text>
            </View>
          )}
        </View>

        {/* Runtime Target Badge */}
        <View className="flex-row items-center gap-2">
          <View className="flex-row items-center gap-1.5 px-2 py-1 rounded-md bg-secondary shadow-border">
            <RuntimeIcon size={12} color="#4d4d4d" />
            <Text className="text-xs text-muted-foreground capitalize">
              {runtimeTarget}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages List */}
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
            <View className="flex-1 items-center justify-center px-8 py-16">
              {isNewThread ? (
                <>
                  <View className="w-16 h-16 rounded-lg bg-card items-center justify-center mb-4 shadow-card">
                    <RuntimeIcon size={28} color="#4d4d4d" />
                  </View>
                  <Text className="text-lg font-semibold text-foreground text-center mb-2">
                    Start a new conversation
                  </Text>
                  <Text className="text-sm text-muted-foreground text-center leading-relaxed">
                    Ask Codex to write code, fix bugs, explain concepts, or help with any coding task.
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-sm text-muted-foreground text-center">
                    No messages in this thread yet.
                  </Text>
                </>
              )}
            </View>
          }
          ListFooterComponent={
            isRunning ? (
              <WorkingIndicator duration={workingDuration} />
            ) : null
          }
          renderItem={({ item: message }) => (
            <MessageBubble message={message} isStreaming={false} />
          )}
          ItemSeparatorComponent={() => <View className="h-2" />}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              listRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />

        {/* Composer */}
        <Composer />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
