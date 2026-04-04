import { Tabs } from "expo-router";
import { MessageSquare, Cpu, Settings } from "lucide-react-native";
import { View, Text } from "../../lib/tw";
import { useWorkspaceStore } from "../../lib/store";

export default function TabLayout() {
  const isConnected = useWorkspaceStore((s) => s.isConnected);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#09090b",
          borderTopColor: "#27272a",
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 64,
        },
        tabBarActiveTintColor: "#fafafa",
        tabBarInactiveTintColor: "#71717a",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Chats",
          tabBarIcon: ({ color, size }) => (
            <MessageSquare size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="machines"
        options={{
          title: "Machines",
          tabBarIcon: ({ color, size }) => (
            <View className="relative">
              <Cpu size={size} color={color} strokeWidth={2} />
              {isConnected && (
                <View className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-success border-2 border-background" />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
