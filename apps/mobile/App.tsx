import { StatusBar } from "expo-status-bar";
import { startTransition, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { OffdexThread } from "@offdex/protocol";
import { mobileTabs, offdexTagline } from "./src/app-config";
import { normalizeBridgeBaseUrl } from "./src/bridge-client";
import { bridgePreferences } from "./src/bridge-preferences";
import { BridgeWorkspaceController } from "./src/bridge-workspace-controller";

type AppTab = (typeof mobileTabs)[number];

export default function App() {
  const controller = useMemo(
    () => new BridgeWorkspaceController({ preferences: bridgePreferences }),
    []
  );
  const [workspaceState, setWorkspaceState] = useState(() => controller.getState());
  const [activeTab, setActiveTab] = useState<AppTab>("Chats");
  const { snapshot, runtimeTarget, bridgeBaseUrl, connectedBridgeUrl, bridgeStatus, isBusy } =
    workspaceState;
  const [selectedThreadId, setSelectedThreadId] = useState(
    snapshot.threads[0]?.id ?? ""
  );
  const [draft, setDraft] = useState("");
  const [pairingDraft, setPairingDraft] = useState("");

  useEffect(() => {
    const unsubscribe = controller.subscribe((nextState) => setWorkspaceState(nextState));
    void controller.hydrate();
    const applyPairingUri = (uri: string | null) => {
      if (!uri?.startsWith("offdex://pair?")) {
        return;
      }

      setPairingDraft(uri);
      void controller.connectFromPairingUri(uri).catch(() => {});
    };

    void Linking.getInitialURL().then((uri) => applyPairingUri(uri));
    const subscription = Linking.addEventListener("url", ({ url }) => {
      applyPairingUri(url);
    });

    return () => {
      unsubscribe();
      subscription.remove();
      controller.dispose();
    };
  }, [controller]);

  useEffect(() => {
    if (!selectedThreadId && snapshot.threads[0]?.id) {
      setSelectedThreadId(snapshot.threads[0].id);
      return;
    }

    if (!snapshot.threads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(snapshot.threads[0]?.id ?? "");
    }
  }, [selectedThreadId, snapshot.threads]);

  const selectedThread =
    snapshot.threads.find((thread) => thread.id === selectedThreadId) ??
    snapshot.threads[0];

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.root}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.brand}>OFFDEX</Text>
            <Text style={styles.heroTitle}>{offdexTagline.replace("Offdex: ", "")}</Text>
            <Text style={styles.heroStatus}>{bridgeStatus}</Text>
          </View>
          {snapshot.capabilityMatrix.runtimes.length > 1 ? (
            <View style={styles.runtimeCluster}>
              {snapshot.capabilityMatrix.runtimes.map((target) => (
                <Pressable
                  key={target}
                  onPress={() => {
                    startTransition(() => {
                      void controller.setRuntimeTarget(target).catch(() => {});
                    });
                  }}
                  style={[
                    styles.runtimeChip,
                    runtimeTarget === target && styles.runtimeChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.runtimeChipText,
                      runtimeTarget === target && styles.runtimeChipTextActive,
                    ]}
                  >
                    {target === "cli" ? "CLI" : "Desktop"}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.cliBadge}>
              <Text style={styles.cliBadgeText}>CLI first</Text>
            </View>
          )}
        </View>

        <View style={styles.tabRow}>
          {mobileTabs.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            >
              <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === "Chats" ? (
          <View style={styles.chatLayout}>
            <ScrollView
              style={styles.threadRail}
              contentContainerStyle={styles.threadRailContent}
              showsVerticalScrollIndicator={false}
            >
              {snapshot.pairing.state !== "paired" ? (
                <View style={styles.onboardingBanner}>
                  <Text style={styles.onboardingEyebrow}>First run</Text>
                  <Text style={styles.onboardingTitle}>Pair your Mac first</Text>
                  <Text style={styles.onboardingBody}>
                    Open the Pairing tab, use a local bridge address, or scan an Offdex pairing code.
                  </Text>
                </View>
              ) : null}
              <SectionLabel title="Recent threads" subtitle={snapshot.pairing.lastSeenAt} />
              {snapshot.threads.map((thread) => (
                <Pressable
                  key={thread.id}
                  onPress={() => setSelectedThreadId(thread.id)}
                  style={[
                    styles.threadCard,
                    thread.id === selectedThread?.id && styles.threadCardActive,
                  ]}
                >
                  <View style={styles.threadCardHeader}>
                    <Text style={styles.threadTitle}>{thread.title}</Text>
                    {thread.unreadCount > 0 ? (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{thread.unreadCount}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.threadMeta}>
                    {thread.projectLabel} · {thread.updatedAt}
                  </Text>
                  <View style={styles.statusRow}>
                    <Pill label={thread.state} tone={thread.state} />
                    <Pill label={thread.runtimeTarget === "cli" ? "CLI" : "Desktop"} tone="neutral" />
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.threadPane}>
              {selectedThread ? (
                <>
                  <View style={styles.threadPaneHeader}>
                    <View style={styles.threadPaneHeaderCopy}>
                      <Text style={styles.threadPaneTitle}>{selectedThread.title}</Text>
                      <Text style={styles.threadPaneSubtitle}>
                        {selectedThread.projectLabel} · {selectedThread.updatedAt}
                      </Text>
                    </View>
                    <Pill label={selectedThread.state} tone={selectedThread.state} />
                  </View>

                  <ScrollView
                    style={styles.messageList}
                    contentContainerStyle={styles.messageListContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {selectedThread.messages.map((message) => (
                      <MessageBubble key={message.id} thread={selectedThread} message={message.body} role={message.role} timestamp={message.createdAt} />
                    ))}
                  </ScrollView>

                  <View style={styles.composer}>
                    <TextInput
                      placeholder="Steer the current run or queue the next turn"
                      placeholderTextColor="#69726d"
                      style={styles.composerInput}
                      multiline
                      value={draft}
                      onChangeText={setDraft}
                    />
                    <View style={styles.composerFooter}>
                      <Text style={styles.composerHint}>
                        Pair once. Stay live. Fall back gracefully.
                      </Text>
                      <Pressable
                        style={[
                          styles.sendButton,
                          !draft.trim() && styles.sendButtonDisabled,
                        ]}
                        disabled={!draft.trim()}
                        onPress={() => {
                          void (async () => {
                            const nextDraft = draft;
                            setDraft("");
                            await controller.sendTurn(selectedThread.id, nextDraft).catch(() => {
                              setDraft(nextDraft);
                            });
                          })();
                        }}
                      >
                        <Text style={styles.sendButtonText}>
                          {selectedThread.state === "running" ? "Queue turn" : "Send"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        ) : null}

        {activeTab === "Pairing" ? (
          <ScrollView
            style={styles.stackPanel}
            contentContainerStyle={styles.stackPanelContent}
            showsVerticalScrollIndicator={false}
          >
            <SectionCard
              eyebrow="Current machine"
              title={snapshot.pairing.macName}
              body="Offdex is focused on the local bridge path for now. Connect to your Mac, stay live, and keep failure states obvious."
            />
            <View style={styles.sectionCard}>
              <Text style={styles.sectionEyebrow}>Bridge</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="http://192.168.1.10:42420"
                placeholderTextColor="#69726d"
                style={styles.bridgeInput}
                value={bridgeBaseUrl}
                onChangeText={(value) => controller.setBridgeBaseUrl(value)}
              />
              <View style={styles.bridgeActionRow}>
                <Pressable
                  style={styles.connectButton}
                  onPress={() => {
                    void controller.connect().catch(() => {});
                  }}
                >
                  <Text style={styles.connectButtonText}>
                    {connectedBridgeUrl ? "Reconnect bridge" : "Connect to bridge"}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    if (connectedBridgeUrl) {
                      void controller.refresh().catch(() => {});
                      return;
                    }

                    controller.disconnect();
                  }}
                >
                  <Text style={styles.secondaryButtonText}>
                    {connectedBridgeUrl ? "Refresh" : "Reset"}
                  </Text>
                </Pressable>
                {isBusy ? <ActivityIndicator color="#d6ff72" /> : null}
              </View>
              <Text style={styles.bridgeStatusText}>{bridgeStatus}</Text>
            </View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionEyebrow}>Pairing link</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="offdex://pair?bridge=..."
                placeholderTextColor="#69726d"
                style={styles.bridgeInput}
                value={pairingDraft}
                onChangeText={setPairingDraft}
              />
              <View style={styles.bridgeActionRow}>
                <Pressable
                  style={styles.connectButton}
                  onPress={() => {
                    void controller.connectFromPairingUri(pairingDraft).catch(() => {});
                  }}
                >
                  <Text style={styles.connectButtonText}>Pair from link</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    void Linking.openURL(
                      `${normalizeBridgeBaseUrl(bridgeBaseUrl)}/pairing`
                    ).catch(() => {});
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Open pairing page</Text>
                </Pressable>
              </View>
              <Text style={styles.bridgeStatusText}>
                Scan the QR on your Mac or paste the same Offdex link here.
              </Text>
            </View>
            <SectionCard
              eyebrow="Bridge paths"
              title={snapshot.pairing.bridgeUrl}
              body="Use one of these local paths when you move from browser testing to your actual phone."
            />
            <View style={styles.sectionCard}>
              <Text style={styles.sectionEyebrow}>Local options</Text>
              <View style={styles.hintWrap}>
                {snapshot.pairing.bridgeHints.map((hint) => (
                  <Pressable
                    key={hint}
                    onPress={() => controller.setBridgeBaseUrl(hint)}
                    style={styles.hintChip}
                  >
                    <Text style={styles.hintChipText}>{hint}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
        ) : null}

        {activeTab === "Settings" ? (
          <ScrollView
            style={styles.stackPanel}
            contentContainerStyle={styles.stackPanelContent}
            showsVerticalScrollIndicator={false}
          >
            <SectionCard
              eyebrow="Runtime target"
              title="Codex CLI"
              body="Desktop mode is intentionally out of the main flow for now. The goal is to make the CLI path feel complete before adding anything else."
            />
            <SectionCard
              eyebrow="Product bar"
              title="No paywall. No companion-app excuses."
              body="The app is open source, free, and judged on feel: speed, stability, visual quality, and confidence after backgrounding."
            />
            <SectionCard
              eyebrow="Platform"
              title="Android first, cross-platform always"
              body="Expo keeps iteration fast. Native modules stay on the table whenever they materially improve pairing, networking, rendering, or device integration."
            />
          </ScrollView>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function SectionLabel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionLabelTitle}>{title}</Text>
      <Text style={styles.sectionLabelSubtitle}>{subtitle}</Text>
    </View>
  );
}

function SectionCard({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

function MessageBubble({
  thread,
  message,
  role,
  timestamp,
}: {
  thread: OffdexThread;
  message: string;
  role: "user" | "assistant" | "system";
  timestamp: string;
}) {
  const isAssistant = role === "assistant";
  return (
    <View
      style={[
        styles.messageBubble,
        isAssistant ? styles.messageBubbleAssistant : styles.messageBubbleUser,
      ]}
    >
      <View style={styles.messageBubbleHeader}>
        <Text style={styles.messageRole}>{isAssistant ? "Codex" : "You"}</Text>
        <Text style={styles.messageTimestamp}>{timestamp}</Text>
      </View>
      <Text style={styles.messageBody}>{message}</Text>
      {isAssistant && thread.state === "running" ? (
        <Text style={styles.messageLiveTag}>Live run</Text>
      ) : null}
    </View>
  );
}

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: "running" | "completed" | "failed" | "idle" | "neutral";
}) {
  return (
    <View
      style={[
        styles.pill,
        tone === "running" && styles.pillRunning,
        tone === "completed" && styles.pillCompleted,
        tone === "failed" && styles.pillFailed,
      ]}
    >
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0b0d0c",
  },
  root: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 14,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brand: {
    color: "#d6ff72",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
  },
  heroTitle: {
    marginTop: 6,
    color: "#eef2ef",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.7,
  },
  heroStatus: {
    marginTop: 6,
    color: "#88928d",
    fontSize: 13,
    maxWidth: 220,
    lineHeight: 18,
  },
  runtimeCluster: {
    flexDirection: "row",
    gap: 8,
  },
  cliBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2a312d",
    backgroundColor: "#131715",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cliBadgeText: {
    color: "#d6ff72",
    fontSize: 13,
    fontWeight: "800",
  },
  runtimeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#242927",
    backgroundColor: "#121514",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  runtimeChipActive: {
    backgroundColor: "#d6ff72",
    borderColor: "#d6ff72",
  },
  runtimeChipText: {
    color: "#b1bab6",
    fontSize: 13,
    fontWeight: "700",
  },
  runtimeChipTextActive: {
    color: "#0b0d0c",
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
  },
  tabButton: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#121514",
    borderWidth: 1,
    borderColor: "#1f2522",
    paddingVertical: 12,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#171c19",
    borderColor: "#324138",
  },
  tabLabel: {
    color: "#8e9893",
    fontSize: 14,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: "#eef2ef",
  },
  chatLayout: {
    flex: 1,
    gap: 12,
  },
  threadRail: {
    maxHeight: 250,
  },
  threadRailContent: {
    gap: 10,
    paddingBottom: 4,
  },
  onboardingBanner: {
    borderRadius: 24,
    backgroundColor: "#101412",
    borderWidth: 1,
    borderColor: "#233028",
    padding: 16,
    gap: 8,
  },
  onboardingEyebrow: {
    color: "#d6ff72",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  onboardingTitle: {
    color: "#eef2ef",
    fontSize: 20,
    fontWeight: "700",
  },
  onboardingBody: {
    color: "#97a19c",
    fontSize: 14,
    lineHeight: 21,
  },
  sectionLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: 2,
  },
  sectionLabelTitle: {
    color: "#eef2ef",
    fontSize: 16,
    fontWeight: "700",
  },
  sectionLabelSubtitle: {
    color: "#7c8581",
    fontSize: 12,
  },
  threadCard: {
    borderRadius: 24,
    backgroundColor: "#131715",
    borderWidth: 1,
    borderColor: "#1e2421",
    padding: 16,
    gap: 9,
  },
  threadCardActive: {
    borderColor: "#3d4a42",
    backgroundColor: "#181d1a",
  },
  threadCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  threadTitle: {
    flex: 1,
    color: "#eef2ef",
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
  unreadBadge: {
    minWidth: 24,
    borderRadius: 999,
    backgroundColor: "#d6ff72",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  unreadBadgeText: {
    color: "#0b0d0c",
    fontWeight: "800",
    fontSize: 12,
  },
  threadMeta: {
    color: "#8e9893",
    fontSize: 13,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
  },
  pill: {
    borderRadius: 999,
    backgroundColor: "#1c211f",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillRunning: {
    backgroundColor: "#223320",
  },
  pillCompleted: {
    backgroundColor: "#1d2a30",
  },
  pillFailed: {
    backgroundColor: "#372125",
  },
  pillText: {
    color: "#d9e1dd",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  threadPane: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: "#131715",
    borderWidth: 1,
    borderColor: "#1f2522",
    overflow: "hidden",
  },
  threadPaneHeader: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1d2320",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  threadPaneHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  threadPaneTitle: {
    color: "#eef2ef",
    fontSize: 18,
    fontWeight: "700",
  },
  threadPaneSubtitle: {
    color: "#89938e",
    fontSize: 13,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    borderRadius: 22,
    padding: 15,
    gap: 8,
  },
  messageBubbleAssistant: {
    backgroundColor: "#191f1c",
  },
  messageBubbleUser: {
    backgroundColor: "#20251f",
  },
  messageBubbleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  messageRole: {
    color: "#d6ff72",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  messageTimestamp: {
    color: "#74807a",
    fontSize: 12,
  },
  messageBody: {
    color: "#edf1ee",
    fontSize: 15,
    lineHeight: 23,
  },
  messageLiveTag: {
    color: "#9ce66e",
    fontSize: 12,
    fontWeight: "700",
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: "#1d2320",
    padding: 16,
    gap: 12,
    backgroundColor: "#121513",
  },
  composerInput: {
    minHeight: 92,
    borderRadius: 22,
    backgroundColor: "#0d0f0e",
    borderWidth: 1,
    borderColor: "#1d2320",
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#eef2ef",
    textAlignVertical: "top",
    fontSize: 15,
    lineHeight: 22,
  },
  composerFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  composerHint: {
    flex: 1,
    color: "#727b77",
    fontSize: 12,
    lineHeight: 17,
  },
  sendButton: {
    borderRadius: 999,
    backgroundColor: "#d6ff72",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendButtonText: {
    color: "#0b0d0c",
    fontSize: 13,
    fontWeight: "800",
  },
  stackPanel: {
    flex: 1,
  },
  stackPanelContent: {
    gap: 12,
    paddingBottom: 8,
  },
  sectionCard: {
    borderRadius: 28,
    backgroundColor: "#131715",
    borderWidth: 1,
    borderColor: "#1e2421",
    padding: 18,
    gap: 8,
  },
  bridgeInput: {
    borderRadius: 18,
    backgroundColor: "#0d0f0e",
    borderWidth: 1,
    borderColor: "#1d2320",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#eef2ef",
    fontSize: 14,
  },
  bridgeActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  connectButton: {
    borderRadius: 999,
    backgroundColor: "#d6ff72",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: "flex-start",
  },
  connectButtonText: {
    color: "#0b0d0c",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#28302c",
    backgroundColor: "#151916",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: "#d5ddd8",
    fontSize: 13,
    fontWeight: "700",
  },
  bridgeStatusText: {
    color: "#97a19c",
    fontSize: 13,
    lineHeight: 20,
  },
  hintWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  hintChip: {
    borderRadius: 18,
    backgroundColor: "#0d0f0e",
    borderWidth: 1,
    borderColor: "#1d2320",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hintChipText: {
    color: "#d7dfda",
    fontSize: 13,
    lineHeight: 18,
  },
  sectionEyebrow: {
    color: "#d6ff72",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: "#eef2ef",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  sectionBody: {
    color: "#9ca6a1",
    fontSize: 15,
    lineHeight: 23,
  },
});
