import { StatusBar } from "expo-status-bar";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>OFFDEX</Text>
          </View>
          <Text style={styles.title}>Codex on your phone.</Text>
          <Text style={styles.body}>
            Local-first control, clean live sync, and a mobile experience that
            feels deliberate from the first tap.
          </Text>
        </View>

        <View style={styles.cluster}>
          <FeatureCard
            eyebrow="Priority"
            title="UX and performance win every tradeoff."
            description="Expo by default. Native modules where they make the app feel faster, smoother, or more reliable."
          />
          <FeatureCard
            eyebrow="Direction"
            title="Android-first reality. Cross-platform discipline."
            description="The product starts where it will actually be used, while keeping iOS and web in the architecture from day one."
          />
          <FeatureCard
            eyebrow="Goal"
            title="Offdex: Codex mobile app."
            description="Not a companion toy. A real phone-grade way to drive Codex with high trust, low friction, and strong visual taste."
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureCard({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureCard}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureBody}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0d0f0e",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
    backgroundColor: "#131715",
    borderWidth: 1,
    borderColor: "#212725",
    gap: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    elevation: 10,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#d8ff72",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: "#0d0f0e",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: {
    color: "#f5f7f6",
    fontSize: 38,
    fontWeight: "700",
    letterSpacing: -1.2,
    lineHeight: 42,
  },
  body: {
    color: "#b4beb9",
    fontSize: 16,
    lineHeight: 24,
  },
  cluster: {
    gap: 14,
  },
  featureCard: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 20,
    backgroundColor: "#111312",
    borderWidth: 1,
    borderColor: "#1d2220",
    gap: 8,
  },
  eyebrow: {
    color: "#d8ff72",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  featureTitle: {
    color: "#f3f5f4",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 25,
  },
  featureBody: {
    color: "#9ea7a2",
    fontSize: 15,
    lineHeight: 22,
  },
});
