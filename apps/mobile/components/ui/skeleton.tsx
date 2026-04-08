import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { View, type ViewProps } from "../../lib/tw";
import { cn } from "../../lib/utils";

// ════════════════════════════════════════════════════════════════════════════
// Skeleton Component
// ════════════════════════════════════════════════════════════════════════════

export interface SkeletonProps extends ViewProps {
  animated?: boolean;
}

export function Skeleton({ className, animated = true, ...props }: SkeletonProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (animated) {
      opacity.value = withRepeat(
        withTiming(0.5, { duration: 1000 }),
        -1,
        true
      );
    }
  }, [animated, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!animated) {
    return (
      <View
        className={cn("rounded-md bg-muted", className)}
        {...props}
      />
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <View
        className={cn("rounded-md bg-muted", className)}
        {...props}
      />
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Skeleton Text - For text placeholders
// ════════════════════════════════════════════════════════════════════════════

export interface SkeletonTextProps extends SkeletonProps {
  width?: number | `${number}%`;
  lines?: number;
}

export function SkeletonText({ 
  width = "100%", 
  lines = 1, 
  className, 
  ...props 
}: SkeletonTextProps) {
  return (
    <View className={cn("gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ 
            width: i === lines - 1 && lines > 1 ? "60%" : width 
          }}
          {...props}
        />
      ))}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Skeleton Circle - For avatar placeholders
// ════════════════════════════════════════════════════════════════════════════

export interface SkeletonCircleProps extends SkeletonProps {
  size?: number;
}

export function SkeletonCircle({ size = 40, className, ...props }: SkeletonCircleProps) {
  return (
    <Skeleton
      className={cn("rounded-full", className)}
      style={{ width: size, height: size }}
      {...props}
    />
  );
}
