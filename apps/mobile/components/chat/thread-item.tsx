import { memo } from "react";
import { View, Text, Pressable } from "../../lib/tw";
import { cn } from "../../lib/utils";
import { StatusBadge } from "../ui/badge";
import { type OffdexThread } from "@offdex/protocol";
import * as Haptics from "expo-haptics";

// ════════════════════════════════════════════════════════════════════════════
// Thread Item Component
// ════════════════════════════════════════════════════════════════════════════

export interface ThreadItemProps {
  thread: OffdexThread;
  isActive: boolean;
  isConnected: boolean;
  onPress: () => void;
}

export const ThreadItem = memo(function ThreadItem({
  thread,
  isActive,
  isConnected,
  onPress,
}: ThreadItemProps) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  // Get last message preview
  const lastMessage = thread.messages[thread.messages.length - 1];
  const preview = lastMessage
    ? `${lastMessage.role === "user" ? "You" : "Codex"}: ${lastMessage.body}`
    : "No messages yet";

  // Determine status to show
  const status = isConnected ? thread.state : "idle";

  return (
    <Pressable
      onPress={handlePress}
      className={cn(
        "mx-4 rounded-xl p-4",
        "active:bg-card-hover",
        isActive ? "bg-card-hover border border-border" : "bg-transparent"
      )}
    >
      {/* Header Row */}
      <View className="flex-row items-start justify-between gap-3 mb-1.5">
        <Text
          className="flex-1 text-base font-semibold text-foreground"
          numberOfLines={1}
        >
          {thread.title}
        </Text>
        
        {thread.unreadCount > 0 && (
          <View className="min-w-[20px] h-5 items-center justify-center rounded-full bg-primary px-1.5">
            <Text className="text-xs font-bold text-primary-foreground">
              {thread.unreadCount}
            </Text>
          </View>
        )}
      </View>

      {/* Preview */}
      <Text
        className="text-sm text-muted-foreground mb-2"
        numberOfLines={1}
      >
        {preview}
      </Text>

      {/* Footer Row */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-xs text-foreground-subtle">
            {thread.projectLabel}
          </Text>
          <Text className="text-xs text-foreground-subtle">·</Text>
          <Text className="text-xs text-foreground-subtle">
            {thread.updatedAt}
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          {status === "running" && (
            <StatusBadge status="running" showDot />
          )}
          <Text className="text-xs text-foreground-subtle uppercase">
            {thread.runtimeTarget === "cli" ? "CLI" : "Desktop"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

// ════════════════════════════════════════════════════════════════════════════
// New Thread Card
// ════════════════════════════════════════════════════════════════════════════

export interface NewThreadCardProps {
  isActive: boolean;
  isAwaiting: boolean;
  onPress: () => void;
}

export function NewThreadCard({ isActive, isAwaiting, onPress }: NewThreadCardProps) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      className={cn(
        "mx-4 rounded-xl p-4 border",
        "active:bg-card-hover",
        isActive ? "bg-card border-ring" : "bg-card border-border"
      )}
    >
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-base font-semibold text-foreground">
          New chat
        </Text>
        {isAwaiting && (
          <View className="flex-row items-center gap-1.5">
            <View className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <View className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <View className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          </View>
        )}
      </View>
      <Text className="text-sm text-muted-foreground">
        {isAwaiting ? "Starting new thread..." : "Start a fresh Codex conversation"}
      </Text>
    </Pressable>
  );
}
