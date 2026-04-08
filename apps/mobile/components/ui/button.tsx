import { forwardRef } from "react";
import { Pressable, Text, ActivityIndicator, type PressableProps } from "../../lib/tw";
import { cn } from "../../lib/utils";
import * as Haptics from "expo-haptics";

// ════════════════════════════════════════════════════════════════════════════
// Button Variants
// ════════════════════════════════════════════════════════════════════════════

type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "outline";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const variantStyles: Record<ButtonVariant, string> = {
  default: "bg-primary",
  primary: "bg-primary",
  secondary: "bg-secondary shadow-border",
  ghost: "bg-transparent",
  destructive: "bg-destructive",
  outline: "bg-transparent shadow-border",
};

const variantTextStyles: Record<ButtonVariant, string> = {
  default: "text-primary-foreground",
  primary: "text-primary-foreground",
  secondary: "text-secondary-foreground",
  ghost: "text-foreground",
  destructive: "text-destructive-foreground",
  outline: "text-foreground",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "h-11 px-5 rounded-md",
  sm: "h-9 px-4 rounded-md",
  lg: "h-12 px-6 rounded-md",
  icon: "h-10 w-10 rounded-full",
};

const sizeTextStyles: Record<ButtonSize, string> = {
  default: "text-sm",
  sm: "text-xs",
  lg: "text-base",
  icon: "text-sm",
};

// ════════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════════

export interface ButtonProps extends Omit<PressableProps, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  haptic?: boolean;
}

export const Button = forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      children,
      loading = false,
      disabled = false,
      haptic = true,
      onPress,
      ...props
    },
    ref
  ) => {
    const handlePress = (e: any) => {
      if (disabled || loading) return;
      if (haptic) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress?.(e);
    };

    const isDisabled = disabled || loading;

    return (
      <Pressable
        ref={ref}
        className={cn(
          "flex-row items-center justify-center gap-2",
          "active:opacity-80",
          variantStyles[variant],
          sizeStyles[size],
          isDisabled && "opacity-50",
          className
        )}
        disabled={isDisabled}
        onPress={handlePress}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={
              variant === "secondary" || variant === "outline" || variant === "ghost"
                ? "#171717"
                : "#ffffff"
            }
          />
        ) : typeof children === "string" ? (
          <Text
            className={cn(
              "font-semibold",
              variantTextStyles[variant],
              sizeTextStyles[size]
            )}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </Pressable>
    );
  }
);

Button.displayName = "Button";
