import { View, Text, type ViewProps, type TextProps } from "../../lib/tw";
import { cn } from "../../lib/utils";

// ════════════════════════════════════════════════════════════════════════════
// Badge Variants
// ════════════════════════════════════════════════════════════════════════════

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "outline";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-primary",
  secondary: "bg-secondary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  outline: "bg-transparent border border-border",
};

const variantTextStyles: Record<BadgeVariant, string> = {
  default: "text-primary-foreground",
  secondary: "text-secondary-foreground",
  success: "text-success-foreground",
  warning: "text-warning-foreground",
  destructive: "text-destructive-foreground",
  outline: "text-foreground",
};

// ════════════════════════════════════════════════════════════════════════════
// Badge Component
// ════════════════════════════════════════════════════════════════════════════

export interface BadgeProps extends ViewProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  return (
    <View
      className={cn(
        "flex-row items-center justify-center",
        "rounded-full px-2.5 py-1",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {typeof children === "string" ? (
        <Text
          className={cn(
            "text-xs font-medium",
            variantTextStyles[variant]
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Status Badge - For thread/connection states
// ════════════════════════════════════════════════════════════════════════════

type StatusType = "running" | "idle" | "completed" | "failed" | "connected" | "disconnected" | "reconnecting";

const statusConfig: Record<StatusType, { bg: string; text: string; dot?: string }> = {
  running: { bg: "bg-success/15", text: "text-success", dot: "bg-success" },
  idle: { bg: "bg-muted", text: "text-muted-foreground" },
  completed: { bg: "bg-info/15", text: "text-info" },
  failed: { bg: "bg-destructive/15", text: "text-destructive" },
  connected: { bg: "bg-success/15", text: "text-success", dot: "bg-success" },
  disconnected: { bg: "bg-muted", text: "text-muted-foreground" },
  reconnecting: { bg: "bg-warning/15", text: "text-warning", dot: "bg-warning" },
};

export interface StatusBadgeProps extends Omit<ViewProps, "children"> {
  status: StatusType;
  showDot?: boolean;
}

export function StatusBadge({ status, showDot = false, className, ...props }: StatusBadgeProps) {
  const config = statusConfig[status];
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <View
      className={cn(
        "flex-row items-center gap-1.5",
        "rounded-full px-2.5 py-1",
        config.bg,
        className
      )}
      {...props}
    >
      {showDot && config.dot && (
        <View className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      )}
      <Text className={cn("text-xs font-medium capitalize", config.text)}>
        {label}
      </Text>
    </View>
  );
}
