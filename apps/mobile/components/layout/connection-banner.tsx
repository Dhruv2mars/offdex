import { View, Text, Pressable } from "../../lib/tw";
import { cn } from "../../lib/utils";
import { useWorkspaceStore } from "../../lib/store";
import { Wifi, WifiOff, RefreshCw } from "../../lib/icons";
import * as Haptics from "expo-haptics";

// ════════════════════════════════════════════════════════════════════════════
// Connection Banner
// ════════════════════════════════════════════════════════════════════════════

export function ConnectionBanner() {
  const connectionState = useWorkspaceStore((s) => s.connectionState);
  const bridgeStatus = useWorkspaceStore((s) => s.bridgeStatus);
  const isConnected = useWorkspaceStore((s) => s.isConnected);
  const isBusy = useWorkspaceStore((s) => s.isBusy);
  const refresh = useWorkspaceStore((s) => s.refresh);

  const handleRefresh = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void refresh();
  };

  // Don't show when connected
  if (isConnected) return null;

  const isReconnecting = connectionState === "connecting" || connectionState === "degraded";

  return (
    <Pressable
      onPress={handleRefresh}
      disabled={isBusy}
      className={cn(
        "flex-row items-center justify-between gap-3",
        "mx-4 mb-3 px-4 py-3 rounded-xl",
        "shadow-border",
        isReconnecting ? "bg-[#fdf2f8]" : "bg-muted"
      )}
    >
      <View className="flex-row items-center gap-3 flex-1">
        {isReconnecting ? (
          <RefreshCw 
            size={18} 
            color="#de1d8d"
            strokeWidth={2}
            className={isBusy ? "animate-spin" : ""}
          />
        ) : (
          <WifiOff size={18} color="#666666" strokeWidth={2} />
        )}
        <View className="flex-1">
          <Text
            className={cn(
              "text-sm font-medium",
              isReconnecting ? "text-preview" : "text-muted-foreground"
            )}
            numberOfLines={1}
          >
            {isReconnecting ? "Reconnecting..." : "Not connected"}
          </Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {bridgeStatus}
          </Text>
        </View>
      </View>
      
      {!isBusy && (
        <Text className="text-xs font-medium text-muted-foreground">
          Tap to retry
        </Text>
      )}
    </Pressable>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Compact Connection Status - For headers
// ════════════════════════════════════════════════════════════════════════════

export function ConnectionStatus() {
  const isConnected = useWorkspaceStore((s) => s.isConnected);
  const connectionState = useWorkspaceStore((s) => s.connectionState);

  const isReconnecting = connectionState === "connecting" || connectionState === "degraded";

  return (
    <View className="flex-row items-center gap-2">
      <View
        className={cn(
          "h-2 w-2 rounded-full",
          isConnected && "bg-success",
          isReconnecting && "bg-warning",
          !isConnected && !isReconnecting && "bg-muted-foreground"
        )}
      />
      <Text className="text-xs text-muted-foreground">
        {isConnected ? "Connected" : isReconnecting ? "Reconnecting" : "Offline"}
      </Text>
    </View>
  );
}
