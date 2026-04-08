import { memo } from "react";
import { View, Text } from "../../lib/tw";
import { cn } from "../../lib/utils";
import { type OffdexMessage } from "@offdex/protocol";

// ════════════════════════════════════════════════════════════════════════════
// Message Bubble Component
// ════════════════════════════════════════════════════════════════════════════

export interface MessageBubbleProps {
  message: OffdexMessage;
  isStreaming?: boolean;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isStreaming = false,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  return (
    <View
      className={cn(
        "px-4 py-2",
        isUser && "items-end"
      )}
    >
      {/* Role Label */}
      <Text className="text-xs font-medium text-muted-foreground mb-1.5 px-1">
        {isUser ? "You" : "Codex"}
      </Text>

      {/* Message Content */}
      <View
        className={cn(
          "rounded-lg px-4 py-3 max-w-[85%]",
          isUser && "bg-primary rounded-br-sm",
          isAssistant && "bg-card shadow-card rounded-bl-sm"
        )}
      >
        <Text
          className={cn(
            "text-sm leading-relaxed",
            isUser && "text-secondary-foreground",
            isAssistant && "text-foreground"
          )}
          selectable
        >
          {message.body}
        </Text>
        
        {/* Streaming indicator */}
        {isStreaming && isAssistant && (
          <View className="flex-row items-center gap-1 mt-2">
            <View className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" />
            <View className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" />
            <View className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" />
          </View>
        )}
      </View>

      {/* Timestamp */}
      <Text className="text-[10px] text-foreground-subtle mt-1 px-1">
        {message.createdAt}
      </Text>
    </View>
  );
});

// ════════════════════════════════════════════════════════════════════════════
// Working Indicator Component
// ════════════════════════════════════════════════════════════════════════════

export interface WorkingIndicatorProps {
  duration?: number;
}

export function WorkingIndicator({ duration }: WorkingIndicatorProps) {
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  return (
    <View className="px-4 py-3">
      <View className="flex-row items-center gap-3 rounded-lg bg-card px-4 py-3 shadow-card">
        {/* Animated dots */}
        <View className="flex-row items-center gap-1">
          <View className="h-2 w-2 rounded-full bg-develop animate-pulse" />
          <View className="h-2 w-2 rounded-full bg-develop animate-pulse" />
          <View className="h-2 w-2 rounded-full bg-develop animate-pulse" />
        </View>
        
        <Text className="text-sm text-muted-foreground">
          Codex is working
          {duration !== undefined && (
            <Text className="text-foreground-subtle">
              {" "}· {formatDuration(duration)}
            </Text>
          )}
        </Text>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// System Message Component
// ════════════════════════════════════════════════════════════════════════════

export interface SystemMessageProps {
  message: string;
}

export function SystemMessage({ message }: SystemMessageProps) {
  return (
    <View className="px-4 py-2">
      <View className="rounded-lg bg-muted px-4 py-3 shadow-border">
        <Text className="text-xs text-muted-foreground text-center">
          {message}
        </Text>
      </View>
    </View>
  );
}
