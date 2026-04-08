import { View, Text, type ViewProps, type TextProps } from "../../lib/tw";
import { cn } from "../../lib/utils";

// ════════════════════════════════════════════════════════════════════════════
// Badge Variants
// ════════════════════════════════════════════════════════════════════════════

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "outline";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-primary",
  secondary: "bg-muted shadow-border",
  success: "bg-accent",
  warning: "bg-[#fdf2f8]",
  destructive: "bg-destructive",
  outline: "bg-transparent shadow-border",
};

const variantTextStyles: Record<BadgeVariant, string> = {
  default: "text-primary-foreground",
  secondary: "text-muted-foreground",
  success: "text-accent-foreground",
  warning: "text-preview",
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
  running: { bg: "bg-accent", text: "text-accent-foreground", dot: "bg-develop" },
  idle: { bg: "bg-muted", text: "text-muted-foreground" },
  completed: { bg: "bg-accent", text: "text-accent-foreground" },
  failed: { bg: "bg-[#fff1f0]", text: "text-destructive" },
  connected: { bg: "bg-accent", text: "text-accent-foreground", dot: "bg-develop" },
  disconnected: { bg: "bg-muted", text: "text-muted-foreground" },
  reconnecting: { bg: "bg-[#fdf2f8]", text: "text-preview", dot: "bg-preview" },
};

type StatusBadgeProps =
  | (Omit<ViewProps, "children"> & {
      status: StatusType;
      showDot?: boolean;
    })
  | (Omit<ViewProps, "children"> & {
      variant: BadgeVariant;
      label: string;
      showDot?: boolean;
    });

export function StatusBadge({
  className,
  showDot = false,
  ...props
}: StatusBadgeProps) {
  if ("status" in props) {
    const { status, ...viewProps } = props;
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
        {...viewProps}
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

  const { variant, label, ...viewProps } = props;

  return (
    <View
      className={cn(
        "flex-row items-center gap-1.5",
        "rounded-full px-2.5 py-1",
        variantStyles[variant],
        className
      )}
      {...viewProps}
    >
      {showDot && (
        <View className={cn("h-1.5 w-1.5 rounded-full", variantTextStyles[variant].replace("text-", "bg-"))} />
      )}
      <Text className={cn("text-xs font-medium", variantTextStyles[variant])}>
        {label}
      </Text>
    </View>
  );
}
