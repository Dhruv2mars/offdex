import { View, Text, Pressable, type ViewProps } from "../../lib/tw";
import { cn } from "../../lib/utils";
import { ChevronLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

// ════════════════════════════════════════════════════════════════════════════
// Header Component
// ════════════════════════════════════════════════════════════════════════════

export interface HeaderProps extends ViewProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  large?: boolean;
}

export function Header({
  title,
  subtitle,
  showBack = false,
  rightAction,
  large = false,
  className,
  children,
  ...props
}: HeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View
      className={cn(
        "px-4 pb-3 pt-2",
        "border-b border-border",
        "bg-background",
        className
      )}
      {...props}
    >
      <View className="flex-row items-center justify-between gap-3">
        {/* Left side */}
        <View className="flex-row items-center gap-3 flex-1">
          {showBack && (
            <Pressable
              onPress={handleBack}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-secondary"
            >
              <ChevronLeft size={24} color="#fafafa" strokeWidth={2} />
            </Pressable>
          )}
          
          {(title || subtitle) && (
            <View className="flex-1">
              {title && (
                <Text
                  className={cn(
                    "font-semibold text-foreground",
                    large ? "text-2xl" : "text-lg"
                  )}
                  numberOfLines={1}
                >
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
          )}
          
          {children}
        </View>

        {/* Right side */}
        {rightAction && (
          <View className="flex-row items-center">
            {rightAction}
          </View>
        )}
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Screen Header - For main screens with large title
// ════════════════════════════════════════════════════════════════════════════

export interface ScreenHeaderProps extends Omit<HeaderProps, "showBack" | "large"> {}

export function ScreenHeader(props: ScreenHeaderProps) {
  return <Header {...props} large showBack={false} />;
}
