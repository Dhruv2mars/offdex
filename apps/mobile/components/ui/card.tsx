import { View, type ViewProps } from "../../lib/tw";
import { cn } from "../../lib/utils";

// ════════════════════════════════════════════════════════════════════════════
// Card Component
// ════════════════════════════════════════════════════════════════════════════

export interface CardProps extends ViewProps {
  variant?: "default" | "elevated" | "outline";
}

export function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <View
      className={cn(
        "rounded-lg",
        variant === "default" && "bg-card shadow-card",
        variant === "elevated" && "bg-card-hover shadow-card",
        variant === "outline" && "bg-transparent shadow-border",
        className
      )}
      {...props}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Card Header
// ════════════════════════════════════════════════════════════════════════════

export function CardHeader({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn("flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Card Title
// ════════════════════════════════════════════════════════════════════════════

import { Text, type TextProps } from "../../lib/tw";

export function CardTitle({ className, ...props }: TextProps) {
  return (
    <Text
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Card Description
// ════════════════════════════════════════════════════════════════════════════

export function CardDescription({ className, ...props }: TextProps) {
  return (
    <Text
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Card Content
// ════════════════════════════════════════════════════════════════════════════

export function CardContent({ className, ...props }: ViewProps) {
  return <View className={cn("p-4 pt-0", className)} {...props} />;
}

// ════════════════════════════════════════════════════════════════════════════
// Card Footer
// ════════════════════════════════════════════════════════════════════════════

export function CardFooter({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn("flex-row items-center p-4 pt-0", className)}
      {...props}
    />
  );
}
