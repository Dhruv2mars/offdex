import { useRef, useState, useCallback } from "react";
import { TextInput as RNTextInput, Platform } from "react-native";
import { View, Text, TextInput, Pressable, KeyboardAvoidingView } from "../../lib/tw";
import { cn } from "../../lib/utils";
import { useWorkspaceStore } from "../../lib/store";
import { Send, Square, Wifi } from "../../lib/icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { feedbackError, feedbackSuccess, feedbackWarning, feedbackSelection } from "../../src/feedback";

// ════════════════════════════════════════════════════════════════════════════
// Composer Component
// ════════════════════════════════════════════════════════════════════════════

export interface ComposerProps {
  className?: string;
  onRequestConnection?: () => void;
}

export function Composer({ className, onRequestConnection }: ComposerProps) {
  const inputRef = useRef<RNTextInput>(null);
  const router = useRouter();
  
  // Store state
  const draft = useWorkspaceStore((s) => s.draft);
  const isConnected = useWorkspaceStore((s) => s.isConnected);
  const codexAccount = useWorkspaceStore((s) => s.codexAccount);
  const activeThread = useWorkspaceStore((s) => s.activeThread);
  const canSendMessage = useWorkspaceStore((s) => s.canSendMessage);
  
  // Actions
  const setDraft = useWorkspaceStore((s) => s.setDraft);
  const sendMessage = useWorkspaceStore((s) => s.sendMessage);
  const stopThread = useWorkspaceStore((s) => s.stopThread);

  const isRunning = activeThread?.state === "running";
  const isAuthenticated = codexAccount?.isAuthenticated ?? false;
  const canSend = isConnected && isAuthenticated && draft.trim().length > 0 && !isRunning;

  // Determine button state and action
  const getButtonConfig = () => {
    if (!isConnected) {
      return {
        label: "Connect",
        icon: Wifi,
        variant: "secondary" as const,
        onPress: () => {
          void feedbackSelection();
          if (onRequestConnection) {
            onRequestConnection();
          } else {
            router.push("/pair");
          }
        },
      };
    }

    if (!isAuthenticated) {
      return {
        label: "Sign in",
        icon: Wifi,
        variant: "secondary" as const,
        onPress: () => {
          void feedbackSelection();
          if (onRequestConnection) {
            onRequestConnection();
          } else {
            router.push("/pair");
          }
        },
      };
    }

    if (isRunning) {
      return {
        label: "Stop",
        icon: Square,
        variant: "destructive" as const,
        onPress: async () => {
          void feedbackWarning();
          try {
            await stopThread();
          } catch {
            void feedbackError();
          }
        },
      };
    }

    return {
      label: "Send",
      icon: Send,
      variant: "primary" as const,
      onPress: async () => {
        if (!canSend) return;
        void feedbackSelection();
        try {
          await sendMessage();
          void feedbackSuccess();
        } catch {
          void feedbackError();
        }
      },
    };
  };

  const buttonConfig = getButtonConfig();

  // Get placeholder text
  const getPlaceholder = () => {
    if (!isConnected) return "Connect to send messages...";
    if (!isAuthenticated) return "Sign in to Codex on your Mac...";
    if (isRunning) return "Codex is working...";
    return "Message Codex...";
  };

  return (
    <View
      className={cn(
        "bg-background px-4 py-3 shadow-border",
        className
      )}
    >
      {/* Input Row */}
      <View className="flex-row items-end gap-3">
        {/* Text Input */}
        <View className="flex-1">
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            placeholder={getPlaceholder()}
            placeholderTextColor="#666666"
            multiline
            maxLength={10000}
            editable={isConnected && isAuthenticated && !isRunning}
            className={cn(
              "min-h-[44px] max-h-[120px] rounded-md bg-input px-4 py-3",
              "text-sm text-foreground leading-relaxed",
              "shadow-border",
              (!isConnected || !isAuthenticated || isRunning) && "opacity-50"
            )}
            textAlignVertical="center"
          />
        </View>

        {/* Action Button */}
        <Pressable
          onPress={buttonConfig.onPress}
          disabled={buttonConfig.variant === "primary" && !canSend}
          className={cn(
            "h-11 w-11 items-center justify-center rounded-full",
            "active:opacity-80",
            buttonConfig.variant === "primary" && "bg-primary",
            buttonConfig.variant === "secondary" && "bg-secondary",
            buttonConfig.variant === "destructive" && "bg-destructive",
            buttonConfig.variant === "primary" && !canSend && "opacity-50"
          )}
        >
          <buttonConfig.icon
            size={18}
            color={buttonConfig.variant === "secondary" ? "#171717" : "#ffffff"}
            strokeWidth={2.5}
          />
        </Pressable>
      </View>

      {/* Helper Text */}
      {!isConnected && (
        <Text className="text-xs text-muted-foreground mt-2 text-center">
          Connect to your Mac to start chatting
        </Text>
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Keyboard Avoiding Composer Wrapper
// ════════════════════════════════════════════════════════════════════════════

export function ComposerWithKeyboard({ className }: ComposerProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
      className={className}
    >
      <Composer />
    </KeyboardAvoidingView>
  );
}
