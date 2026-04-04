import { View, Text } from "../../lib/tw";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { LucideIcon } from "lucide-react-native";

// ════════════════════════════════════════════════════════════════════════════
// Empty State Component
// ════════════════════════════════════════════════════════════════════════════

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <View
      className={cn(
        "flex-1 items-center justify-center px-8 py-12",
        className
      )}
    >
      {Icon && (
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Icon size={28} color="#71717a" strokeWidth={1.5} />
        </View>
      )}
      
      <Text className="text-center text-lg font-semibold text-foreground mb-2">
        {title}
      </Text>
      
      {description && (
        <Text className="text-center text-sm text-muted-foreground max-w-[280px] leading-relaxed">
          {description}
        </Text>
      )}
      
      {action && (
        <Button
          variant="secondary"
          className="mt-6"
          onPress={action.onPress}
        >
          {action.label}
        </Button>
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Section Header
// ════════════════════════════════════════════════════════════════════════════

export interface SectionHeaderProps {
  title: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  className?: string;
}

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <View className={cn("flex-row items-center justify-between px-4 py-2", className)}>
      <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </Text>
      {action && (
        <Text
          className="text-xs font-medium text-primary"
          onPress={action.onPress}
        >
          {action.label}
        </Text>
      )}
    </View>
  );
}
