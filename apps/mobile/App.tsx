import { CameraView, useCameraPermissions } from "expo-camera";
import * as Clipboard from "expo-clipboard";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import { memo, startTransition, useEffect, useMemo, useRef, useState } from "react";
import { FlashList } from "@shopify/flash-list";
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { OFFDEX_NEW_THREAD_ID, type OffdexThread } from "@offdex/protocol";
import LaunchIntentModule from "./modules/launch-intent";
import { mobileTabs, offdexTagline } from "./src/app-config";
import { normalizeBridgeBaseUrl } from "./src/bridge-client";
import { bridgePreferences } from "./src/bridge-preferences";
import { BridgeWorkspaceController } from "./src/bridge-workspace-controller";
import {
  feedbackError,
  feedbackSelection,
  feedbackSuccess,
  feedbackWarning,
} from "./src/feedback";
import { extractOffdexPairingUri } from "./src/pairing-scan";
import { resolveInitialPairingUri } from "./src/initial-pairing";
import { createLaunchUrlGate } from "./src/launch-url";
import {
  getChatReadiness,
  getMachineAvailabilityLabel,
  getMachineConnectionAction,
  getPairingGuide,
  getSessionBanner,
} from "./src/session-readiness";

type AppTab = (typeof mobileTabs)[number];

export default function App() {
  const controller = useMemo(
    () => new BridgeWorkspaceController({ preferences: bridgePreferences }),
    []
  );
  const launchUrlGate = useRef(createLaunchUrlGate());
  const [workspaceState, setWorkspaceState] = useState(() => controller.getState());
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<AppTab>("Chats");
  const {
    snapshot,
    runtimeTarget,
    bridgeBaseUrl,
    connectedBridgeUrl,
    connectionTransport,
    connectionState,
    bridgeStatus,
    relayUrl,
    trustedPairing,
    isBusy,
    machines,
    managedSession,
    codexAccount,
  } = workspaceState;
  const [selectedThreadId, setSelectedThreadId] = useState(
    snapshot.threads[0]?.id ?? ""
  );
  const [draft, setDraft] = useState("");
  const [pairingDraft, setPairingDraft] = useState("");
  const [awaitingNewThread, setAwaitingNewThread] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const applyPairingUri = (uri: string | null) => {
    const launchUrl = launchUrlGate.current(uri);
    const pairingUri = extractOffdexPairingUri(launchUrl);
    if (!pairingUri) {
      return;
    }

    startTransition(() => setActiveTab("Pairing"));
    setPairingDraft(pairingUri);
    setScanStatus(null);
    void controller
      .connectFromPairingUri(pairingUri)
      .then(() => {
        startTransition(() => setActiveTab("Chats"));
        void feedbackSuccess();
        setScannerVisible(false);
        setScanLocked(false);
      })
      .catch((error) => {
        void feedbackError();
        setScanStatus(error instanceof Error ? error.message : "Pairing failed.");
      });
  };

  useEffect(() => {
    const unsubscribe = controller.subscribe((nextState) => setWorkspaceState(nextState));
    void (async () => {
      const initialPairingUri = resolveInitialPairingUri([
        LaunchIntentModule.consumePendingUrl(),
        await Linking.getInitialURL(),
      ]);

      if (initialPairingUri) {
        applyPairingUri(initialPairingUri);
        return;
      }

      await controller.hydrate();
    })();
    const subscription = LaunchIntentModule.addListener("onUrl", ({ url }) => {
      applyPairingUri(url);
    });
    const linkingSubscription = Linking.addEventListener("url", ({ url }) => {
      applyPairingUri(url);
    });
    let appState = AppState.currentState;
    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      const didResume =
        (appState === "background" || appState === "inactive") && nextState === "active";
      appState = nextState;

      if (!didResume) {
        return;
      }

      void controller.resume().catch(() => {
        void feedbackError();
      });
    });

    return () => {
      unsubscribe();
      subscription.remove();
      linkingSubscription.remove();
      appStateSubscription.remove();
      controller.dispose();
    };
  }, [controller]);

  useEffect(() => {
    if (
      awaitingNewThread &&
      snapshot.threads[0]?.id &&
      snapshot.threads[0].id !== OFFDEX_NEW_THREAD_ID
    ) {
      setAwaitingNewThread(false);
      setSelectedThreadId(snapshot.threads[0].id);
      return;
    }

    if (!selectedThreadId && snapshot.threads[0]?.id) {
      setSelectedThreadId(snapshot.threads[0].id);
      return;
    }

    if (selectedThreadId === OFFDEX_NEW_THREAD_ID) {
      return;
    }

    if (!snapshot.threads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(snapshot.threads[0]?.id ?? "");
    }
  }, [awaitingNewThread, selectedThreadId, snapshot.threads]);

  const draftThread: OffdexThread = {
    id: OFFDEX_NEW_THREAD_ID,
    title: "New chat",
    projectLabel: snapshot.pairing.state === "paired" ? snapshot.pairing.macName : "offdex",
    runtimeTarget,
    state: "idle",
    unreadCount: 0,
    updatedAt: awaitingNewThread ? "Starting…" : "Ready",
    messages: [],
  };
  const isDraftThread = selectedThreadId === OFFDEX_NEW_THREAD_ID;
  const isLiveConnection = connectionState === "live";
  const showThreadHistory =
    snapshot.pairing.state === "paired" ||
    connectionState !== "idle" ||
    connectedBridgeUrl !== null;
  const visibleThreads = showThreadHistory ? snapshot.threads : [];
  const activeThread = isDraftThread
    ? draftThread
    : visibleThreads.find((thread) => thread.id === selectedThreadId) ?? visibleThreads[0];
  const pairingPrimaryLabel = isLiveConnection
    ? "Refresh bridge"
    : connectionState === "degraded"
      ? "Retry now"
      : connectedBridgeUrl
        ? "Reconnect bridge"
        : "Connect to bridge";
  const pairingSecondaryLabel =
    isLiveConnection || connectionState !== "idle" || connectedBridgeUrl ? "Disconnect" : "Reset";
  const relayReady = Boolean(relayUrl);
  const transportLabel =
    connectionTransport === "relay"
      ? "Secure relay"
      : connectionTransport === "direct"
        ? "Direct machine link"
      : connectionTransport === "bridge"
        ? "Local bridge"
        : "Not connected";
  const codexReady = Boolean(codexAccount?.isAuthenticated);
  const chatReadiness = getChatReadiness({
    pairingState: snapshot.pairing.state,
    connectionState,
    codexReady,
    isDraftThread,
  });
  const pairingGuide = getPairingGuide({
    pairingState: snapshot.pairing.state,
    connectionState,
    trustedPairing,
    codexReady,
    hasManagedSession: Boolean(managedSession),
    machineCount: machines.length,
  });
  const sessionBanner = getSessionBanner({
    macName: snapshot.pairing.macName,
    pairingState: snapshot.pairing.state,
    connectionState,
    connectionTransport,
    codexReady,
    machineCount: machines.length,
    hasManagedSession: Boolean(managedSession),
  });
  const isWideLayout = width >= 980;

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    void NavigationBar.setBackgroundColorAsync("#0b0d0c").catch(() => {});
    void NavigationBar.setButtonStyleAsync("light").catch(() => {});
  }, []);

  const openScanner = () => {
    void feedbackSelection();
    setScanLocked(false);
    setScanStatus(null);
    setScannerVisible(true);
    if (!cameraPermission?.granted && cameraPermission?.canAskAgain !== false) {
      void requestCameraPermission();
    }
  };

  const handleScannedPairing = (value: string) => {
    if (scanLocked) {
      return;
    }

    const pairingUri = extractOffdexPairingUri(value);
    if (!pairingUri) {
      void feedbackError();
      setScanLocked(true);
      setScanStatus("That QR code is not an Offdex pairing code.");
      return;
    }

    setScanLocked(true);
    setScanStatus("Pairing with your Mac…");
    setPairingDraft(pairingUri);
    void controller
      .connectFromPairingUri(pairingUri)
      .then(() => {
        void feedbackSuccess();
        setScannerVisible(false);
        setScanLocked(false);
        setScanStatus(null);
      })
      .catch((error) => {
        void feedbackError();
        setScanStatus(error instanceof Error ? error.message : "Pairing failed.");
      });
  };

  const disconnectPhone = () => {
    void feedbackWarning();
    setPairingDraft("");
    controller.disconnect();
  };

  const copyValue = (value: string) => {
    void Clipboard.setStringAsync(value)
      .then(() => {
        setScanStatus("Copied to clipboard.");
        return feedbackSuccess();
      })
      .catch(() => {
        void feedbackError();
      });
  };

  const runPairingPrimaryAction = () => {
    void feedbackSelection();
    switch (pairingGuide.primaryAction) {
      case "scan":
        setActiveTab("Pairing");
        openScanner();
        return;
      case "nearby":
      case "macStatus":
        setActiveTab("Pairing");
        return;
      case "refreshMachines":
        void controller
          .refreshManagedMachines()
          .then(() => {
            void feedbackSuccess();
          })
          .catch(() => {
            void feedbackError();
          });
        return;
      case "refreshNow":
        if (managedSession || connectionState === "degraded") {
          void controller
            .resume()
            .then(() => {
              void feedbackSuccess();
            })
            .catch(() => {
              void feedbackError();
            });
          return;
        }

        if (isLiveConnection) {
          void controller
            .refresh()
            .then(() => {
              void feedbackSuccess();
            })
            .catch(() => {
              void feedbackError();
            });
          return;
        }

        void controller
          .connect()
          .then(() => {
            void feedbackSuccess();
          })
          .catch(() => {
            void feedbackError();
          });
    }
  };

  const runPairingSecondaryAction = () => {
    if (!pairingGuide.secondaryAction) {
      return;
    }

    void feedbackSelection();
    switch (pairingGuide.secondaryAction) {
      case "nearby":
        setActiveTab("Pairing");
        return;
      case "disconnect":
        disconnectPhone();
    }
  };

  const connectTrustedMachine = (machineId: string) => {
    void feedbackSelection();
    void controller
      .connectManagedMachine(machineId)
      .then(() => {
        void feedbackSuccess();
      })
      .catch(() => {
        void feedbackError();
      });
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="light" />
        <LinearGradient
          colors={["#111915", "#0b0d0c", "#090a09"]}
          locations={[0, 0.46, 1]}
          style={styles.ambientBackground}
        />
        <View pointerEvents="none" style={styles.ambientOrbTop} />
        <View pointerEvents="none" style={styles.ambientOrbBottom} />
        <KeyboardAvoidingView
          style={styles.screen}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
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
                        void feedbackSelection();
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

            <SessionHero
              banner={sessionBanner}
              macName={snapshot.pairing.macName}
              codexLabel={
                codexAccount?.isAuthenticated
                  ? codexAccount.email ?? codexAccount.name ?? "Codex ready"
                  : "Codex sign-in needed"
              }
              transportLabel={transportLabel}
              machineCount={machines.length}
            />

            <View style={styles.tabRow}>
              {mobileTabs.map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => {
                    void feedbackSelection();
                    setActiveTab(tab);
                  }}
                  style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
                >
                  <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                    {tab}
                  </Text>
                </Pressable>
              ))}
            </View>

            {activeTab === "Chats" ? (
              <View style={[styles.chatLayout, isWideLayout && styles.chatLayoutWide]}>
            <FlashList
              data={visibleThreads}
              style={isWideLayout ? styles.threadRailWide : styles.threadRail}
              contentContainerStyle={styles.threadRailContent}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <>
                  <Pressable
                    onPress={() => {
                      setAwaitingNewThread(false);
                      setDraft("");
                      setSelectedThreadId(OFFDEX_NEW_THREAD_ID);
                    }}
                    style={[
                      styles.newThreadCard,
                      isDraftThread && styles.newThreadCardActive,
                    ]}
                  >
                    <Text style={styles.newThreadEyebrow}>New chat</Text>
                    <Text style={styles.newThreadTitle}>Start a fresh Codex thread</Text>
                    <Text style={styles.newThreadBody}>
                      Open a clean run, send the first prompt, and Offdex will stay on the live thread.
                    </Text>
                  </Pressable>
                  {chatReadiness.onboarding ? (
                    <View style={styles.onboardingBanner}>
                      <Text style={styles.onboardingEyebrow}>{chatReadiness.onboarding.eyebrow}</Text>
                      <Text style={styles.onboardingTitle}>{chatReadiness.onboarding.title}</Text>
                      <Text style={styles.onboardingBody}>{chatReadiness.onboarding.body}</Text>
                      <View style={styles.inlineActionRow}>
                        <Pressable style={styles.connectButton} onPress={runPairingPrimaryAction}>
                          <Text style={styles.connectButtonText}>{pairingGuide.primaryLabel}</Text>
                        </Pressable>
                        {pairingGuide.secondaryLabel ? (
                          <Pressable
                            style={styles.secondaryButton}
                            onPress={runPairingSecondaryAction}
                          >
                            <Text style={styles.secondaryButtonText}>
                              {pairingGuide.secondaryLabel}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                  {visibleThreads.length > 0 ? (
                    <SectionLabel title="Recent threads" subtitle={snapshot.pairing.lastSeenAt} />
                  ) : null}
                </>
              }
              ListEmptyComponent={
                <View style={styles.emptyRailCard}>
                  <Text style={styles.emptyRailTitle}>{chatReadiness.emptyRail.title}</Text>
                  <Text style={styles.emptyRailBody}>{chatReadiness.emptyRail.body}</Text>
                </View>
              }
              renderItem={({ item: thread }) => (
                <Pressable
                  onPress={() => setSelectedThreadId(thread.id)}
                  style={[
                    styles.threadCard,
                    thread.id === activeThread?.id && styles.threadCardActive,
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
                    <Pill
                      label={isLiveConnection ? thread.state : "preview"}
                      tone={isLiveConnection ? thread.state : "neutral"}
                    />
                    <Pill
                      label={thread.runtimeTarget === "cli" ? "CLI" : "Desktop"}
                      tone="neutral"
                    />
                  </View>
                </Pressable>
              )}
            />

            <View style={[styles.threadPane, isWideLayout && styles.threadPaneWide]}>
              {activeThread ? (
                <>
                  <View style={styles.threadPaneHeader}>
                    <View style={styles.threadPaneHeaderCopy}>
                      <Text style={styles.threadPaneTitle}>{activeThread.title}</Text>
                      <Text style={styles.threadPaneSubtitle}>
                        {isDraftThread
                          ? awaitingNewThread
                            ? "Waiting for Codex to open the thread"
                            : "Send the first prompt to start a fresh Codex chat"
                          : `${activeThread.projectLabel} · ${activeThread.updatedAt}`}
                      </Text>
                    </View>
                    <Pill
                      label={
                        isDraftThread
                          ? "new"
                          : isLiveConnection
                            ? activeThread.state
                            : "preview"
                      }
                      tone={
                        isDraftThread || !isLiveConnection ? "neutral" : activeThread.state
                      }
                    />
                  </View>

                  <FlashList
                    data={activeThread.messages}
                    style={styles.messageList}
                    contentContainerStyle={styles.messageListContent}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                      <>
                        <View style={styles.readinessCard}>
                          <Text style={styles.readinessEyebrow}>{transportLabel}</Text>
                          <Text style={styles.readinessTitle}>{chatReadiness.paneStatus.title}</Text>
                          <Text style={styles.readinessBody}>{chatReadiness.paneStatus.body}</Text>
                        </View>
                        {isDraftThread ? (
                          <View style={styles.newThreadPanel}>
                            <Text style={styles.newThreadPanelEyebrow}>Fresh thread</Text>
                            <Text style={styles.newThreadPanelTitle}>Start from a blank context</Text>
                            <Text style={styles.newThreadPanelBody}>
                              Offdex will create the thread on your Mac, move into the live session, and keep the phone synced as Codex responds.
                            </Text>
                          </View>
                        ) : null}
                      </>
                    }
                    renderItem={({ item: message }) => (
                      <MessageBubble
                        thread={activeThread}
                        message={message.body}
                        role={message.role}
                        timestamp={message.createdAt}
                      />
                    )}
                  />

                  <View style={styles.composer}>
                    <TextInput
                      placeholder={chatReadiness.composer.placeholder}
                      placeholderTextColor="#69726d"
                      style={styles.composerInput}
                      multiline
                      value={draft}
                      onChangeText={setDraft}
                    />
                    <View style={styles.composerFooter}>
                      <Text style={styles.composerHint}>{chatReadiness.composer.hint}</Text>
                      <Pressable
                        style={[
                          styles.sendButton,
                          isLiveConnection &&
                          codexReady &&
                          activeThread.state !== "running" &&
                            !draft.trim() &&
                            styles.sendButtonDisabled,
                          isLiveConnection &&
                            codexReady &&
                            activeThread.state === "running" &&
                            styles.stopButton,
                        ]}
                        disabled={
                          isLiveConnection
                            ? codexReady &&
                              activeThread.state !== "running" &&
                              !draft.trim()
                            : false
                        }
                        onPress={() => {
                          void (async () => {
                            if (!isLiveConnection || !codexReady) {
                              void feedbackSelection();
                              setActiveTab("Pairing");
                              return;
                            }

                            if (activeThread.state === "running") {
                              void feedbackWarning();
                              await controller.interruptThread(activeThread.id).catch(() => {});
                              return;
                            }

                            const nextDraft = draft;
                            setDraft("");
                            if (activeThread.id === OFFDEX_NEW_THREAD_ID) {
                              setAwaitingNewThread(true);
                            }

                            void feedbackSelection();
                            await controller
                              .sendTurn(activeThread.id, nextDraft)
                              .then((nextState) => {
                                void feedbackSuccess();
                                if (
                                  activeThread.id === OFFDEX_NEW_THREAD_ID &&
                                  nextState.snapshot.threads[0]?.id &&
                                  nextState.snapshot.threads[0].id !== OFFDEX_NEW_THREAD_ID
                                ) {
                                  setAwaitingNewThread(false);
                                  setSelectedThreadId(nextState.snapshot.threads[0].id);
                                }
                              })
                              .catch(() => {
                                void feedbackError();
                                setAwaitingNewThread(false);
                                setDraft(nextDraft);
                              });
                          })();
                        }}
                      >
                        <Text style={styles.sendButtonText}>
                          {isLiveConnection && codexReady && activeThread.state === "running"
                            ? "Stop"
                            : chatReadiness.composer.buttonLabel}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.emptyPane}>
                  <Text style={styles.emptyPaneEyebrow}>{pairingGuide.eyebrow}</Text>
                  <Text style={styles.emptyPaneTitle}>{chatReadiness.paneStatus.title}</Text>
                  <Text style={styles.emptyPaneBody}>{chatReadiness.paneStatus.body}</Text>
                  <View style={styles.inlineActionRow}>
                    <Pressable onPress={runPairingPrimaryAction} style={styles.connectButton}>
                      <Text style={styles.connectButtonText}>{pairingGuide.primaryLabel}</Text>
                    </Pressable>
                    {pairingGuide.secondaryLabel ? (
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={runPairingSecondaryAction}
                      >
                        <Text style={styles.secondaryButtonText}>
                          {pairingGuide.secondaryLabel}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              )}
            </View>
              </View>
            ) : null}

            {activeTab === "Pairing" ? (
              <ScrollView
                style={styles.stackPanel}
                contentContainerStyle={styles.stackPanelContent}
                contentInsetAdjustmentBehavior="automatic"
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    tintColor="#d6ff72"
                    refreshing={isBusy}
                    onRefresh={() => {
                      if (managedSession) {
                        void controller.refreshManagedMachines().catch(() => {
                          void feedbackError();
                        });
                        return;
                      }

                      const refreshTask =
                        connectionState === "live" ? controller.refresh() : controller.resume();
                      void refreshTask.catch(() => {
                        void feedbackError();
                      });
                    }}
                  />
                }
              >
                <View style={styles.guideCard}>
                  <Text style={styles.guideEyebrow}>{pairingGuide.eyebrow}</Text>
                  <Text style={styles.guideTitle}>{pairingGuide.title}</Text>
                  <Text style={styles.guideBody}>{pairingGuide.body}</Text>
                  <View style={styles.inlineActionRow}>
                    <Pressable style={styles.connectButton} onPress={runPairingPrimaryAction}>
                      <Text style={styles.connectButtonText}>{pairingGuide.primaryLabel}</Text>
                    </Pressable>
                    {pairingGuide.secondaryLabel ? (
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={runPairingSecondaryAction}
                      >
                        <Text style={styles.secondaryButtonText}>
                          {pairingGuide.secondaryLabel}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
                <SectionCard
                  eyebrow="Current machine"
                  title={snapshot.pairing.macName}
                  body="Pair once, keep the Mac online, and Offdex will reconnect on its own until you explicitly disconnect this phone."
                />
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionEyebrow}>My machines</Text>
                  <Text style={styles.sectionTitle}>
                    {managedSession ? managedSession.ownerLabel : "Nearby setup only"}
                  </Text>
                  <Text style={styles.sectionBody}>
                    {managedSession
                      ? "Trusted machines stay attached to this phone. Tap one to reconnect from anywhere while that machine is online."
                      : "Scan the QR on a machine once. After that, Offdex stores a trusted device session and your machines appear here automatically."}
                  </Text>
                  {machines.length > 0 ? (
                    <View style={styles.machineList}>
                      {machines.map((machine) => {
                        const availabilityLabel = getMachineAvailabilityLabel({
                          machine,
                          selectedMachineId: managedSession?.machineId ?? null,
                          connectionState,
                          codexReady,
                        });
                        const machineAction = getMachineConnectionAction({
                          machine,
                          selectedMachineId: managedSession?.machineId ?? null,
                          connectionState,
                          codexReady,
                        });

                        return (
                          <View key={machine.machineId} style={styles.machineCard}>
                            <View style={styles.machineCardHeader}>
                              <View style={styles.machineCardCopy}>
                                <Text style={styles.machineCardTitle}>{machine.macName}</Text>
                                <Text style={styles.machineCardMeta}>
                                  {availabilityLabel} · {machine.lastSeenAt}
                                </Text>
                              </View>
                              <Pill
                                label={machine.runtimeTarget === "cli" ? "CLI" : "Desktop"}
                                tone="neutral"
                              />
                            </View>
                            <Text style={styles.machineCardBody}>
                              <Text selectable style={styles.machineCardPath}>
                                {machine.localBridgeUrl}
                              </Text>
                              {"\n"}
                              {machine.machineId === managedSession?.machineId
                                ? codexReady
                                  ? "This is the machine currently driving the live session."
                                  : "This is the active machine, but Codex there still needs sign-in."
                                : machine.online
                                  ? "Trusted and online. You can move this phone back onto it immediately."
                                  : "Trusted, but currently offline. Offdex will use it again once it comes back online."}
                            </Text>
                            <View style={styles.inlineActionRow}>
                              <Pressable
                                style={[
                                  styles.machineActionButton,
                                  machineAction.disabled && styles.machineActionButtonDisabled,
                                ]}
                                disabled={machineAction.disabled}
                                onPress={() => connectTrustedMachine(machine.machineId)}
                              >
                                <Text style={styles.machineActionButtonText}>
                                  {machineAction.label}
                                </Text>
                              </Pressable>
                              <Pressable
                                style={styles.secondaryButton}
                                onPress={() => copyValue(machine.localBridgeUrl)}
                              >
                                <Text style={styles.secondaryButtonText}>Copy path</Text>
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionEyebrow}>Trust</Text>
                  <Text style={styles.sectionTitle}>
                    {trustedPairing ? "This phone is trusted" : "This phone is not trusted yet"}
                  </Text>
                  <Text style={styles.sectionBody}>
                    {trustedPairing
                      ? "The pairing link is saved on this device. Offdex will keep trying the same Mac until you disconnect."
                      : "Scan once or paste the pairing link once. After that, this phone should not need to pair again."}
                  </Text>
                </View>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionEyebrow}>Codex account</Text>
                  <Text style={styles.sectionTitle}>
                    {codexAccount?.email ?? codexAccount?.name ?? "Sign in on your Mac"}
                  </Text>
                  <Text style={styles.sectionBody}>
                    {codexAccount?.isAuthenticated
                      ? `Offdex is using the Codex session already running on this machine${codexAccount.planType ? ` (${codexAccount.planType})` : ""}.`
                      : "The transport is ready, but Codex on this machine is not signed in yet. Open Codex on your Mac and sign in there first."}
                  </Text>
                </View>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionEyebrow}>Connection path</Text>
                  <Text style={styles.sectionTitle}>{transportLabel}</Text>
                  <Text style={styles.sectionBody}>
                    {connectionTransport === "relay"
                      ? `Remote access is flowing through ${relayUrl}. Traffic stays encrypted end to end.`
                      : connectionTransport === "direct"
                        ? "Offdex reached your machine directly with a short-lived ticket from the control plane."
                      : relayReady
                        ? `Your Mac is also attached to ${relayUrl}, so remote access is ready after one trusted QR scan.`
                        : "Using the direct local bridge path right now."}
                  </Text>
                </View>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionEyebrow}>Nearby setup</Text>
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
                        if (isLiveConnection) {
                          void controller.refresh().then(() => {
                            void feedbackSuccess();
                          }).catch(() => {
                            void feedbackError();
                          });
                          return;
                        }

                        void controller.connect().then(() => {
                          void feedbackSuccess();
                        }).catch(() => {
                          void feedbackError();
                        });
                      }}
                    >
                      <Text style={styles.connectButtonText}>{pairingPrimaryLabel}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => {
                        if (isLiveConnection || connectionState !== "idle" || connectedBridgeUrl) {
                          disconnectPhone();
                          return;
                        }

                        controller.setBridgeBaseUrl("http://127.0.0.1:42420");
                        setPairingDraft("");
                        disconnectPhone();
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>{pairingSecondaryLabel}</Text>
                    </Pressable>
                    {isBusy ? <ActivityIndicator color="#d6ff72" /> : null}
                  </View>
                  <Text style={styles.bridgeStatusText}>{bridgeStatus}</Text>
                </View>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionEyebrow}>Pair once</Text>
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
                        void controller.connectFromPairingUri(pairingDraft).then(() => {
                          void feedbackSuccess();
                        }).catch(() => {
                          void feedbackError();
                        });
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
                  <Pressable style={styles.scanButton} onPress={openScanner}>
                    <Text style={styles.scanButtonText}>Scan QR from your Mac</Text>
                  </Pressable>
                  <Text style={styles.bridgeStatusText}>
                    Scan once or paste the same Offdex link here. Offdex stores that trust until you disconnect this phone.
                  </Text>
                </View>
                <SectionCard
                  eyebrow="Bridge paths"
                  title={snapshot.pairing.bridgeUrl}
                  body="Use one of these local paths on the same Wi-Fi. If the bridge is also registered with the managed remote path, the same trusted phone keeps working away from home too."
                />
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionEyebrow}>Local options</Text>
                  <Text style={styles.sectionBody}>
                    Tap a path to use it. Hold a path to copy it.
                  </Text>
                  <View style={styles.hintWrap}>
                    {snapshot.pairing.bridgeHints.map((hint) => (
                      <Pressable
                        key={hint}
                        onPress={() => controller.setBridgeBaseUrl(hint)}
                        onLongPress={() => copyValue(hint)}
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
                contentInsetAdjustmentBehavior="automatic"
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    tintColor="#d6ff72"
                    refreshing={isBusy}
                    onRefresh={() => {
                      const refreshTask =
                        connectionState === "live" ? controller.refresh() : controller.resume();
                      void refreshTask.catch(() => {
                        void feedbackError();
                      });
                    }}
                  />
                }
              >
                <SectionCard
                  eyebrow="Runtime target"
                  title="Codex CLI"
                  body="Desktop mode is intentionally out of the main flow for now. The goal is to make the CLI path feel complete before adding anything else."
                />
                <SectionCard
                  eyebrow="Machine session"
                  title={codexAccount?.email ?? "Mac not signed in"}
                  body={
                    codexAccount?.isAuthenticated
                      ? "Your phone controls the Codex session already authenticated on the machine. Offdex does not ask the phone to sign in separately."
                      : "Offdex remote pairing can be trusted before Codex is signed in, but real work still depends on the machine-side Codex login."
                  }
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
        </KeyboardAvoidingView>
        <PairingScannerModal
          visible={scannerVisible}
          granted={cameraPermission?.granted ?? false}
          canAskAgain={cameraPermission?.canAskAgain ?? true}
          locked={scanLocked}
          status={scanStatus}
          onClose={() => {
            setScannerVisible(false);
            setScanLocked(false);
            setScanStatus(null);
          }}
          onRequestPermission={() => {
            setScanStatus(null);
            void requestCameraPermission();
          }}
          onScanAgain={() => {
            setScanLocked(false);
            setScanStatus(null);
          }}
          onScanned={handleScannedPairing}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function SessionHero({
  banner,
  macName,
  codexLabel,
  transportLabel,
  machineCount,
}: {
  banner: ReturnType<typeof getSessionBanner>;
  macName: string;
  codexLabel: string;
  transportLabel: string;
  machineCount: number;
}) {
  return (
    <LinearGradient
      colors={["rgba(214,255,114,0.18)", "rgba(20,25,22,0.92)", "rgba(10,12,11,0.98)"]}
      locations={[0, 0.28, 1]}
      style={styles.sessionHero}
    >
      <BlurView intensity={36} tint="dark" style={styles.sessionHeroBlur}>
        <View style={styles.sessionHeroHeader}>
          <View style={styles.sessionHeroCopy}>
            <Text style={styles.sessionHeroEyebrow}>{banner.eyebrow}</Text>
            <Text style={styles.sessionHeroTitle}>{banner.title}</Text>
            <Text style={styles.sessionHeroBody}>{banner.body}</Text>
          </View>
          <View
            style={[
              styles.sessionHeroAccent,
              banner.accent === "ready" && styles.sessionHeroAccentReady,
              banner.accent === "attention" && styles.sessionHeroAccentAttention,
              banner.accent === "reconnecting" && styles.sessionHeroAccentReconnect,
            ]}
          />
        </View>
        <View style={styles.sessionHeroMetaRow}>
          <View style={styles.sessionMetaPill}>
            <Text style={styles.sessionMetaLabel}>Machine</Text>
            <Text style={styles.sessionMetaValue}>{macName}</Text>
          </View>
          <View style={styles.sessionMetaPill}>
            <Text style={styles.sessionMetaLabel}>Transport</Text>
            <Text style={styles.sessionMetaValue}>{transportLabel}</Text>
          </View>
          <View style={styles.sessionMetaPill}>
            <Text style={styles.sessionMetaLabel}>Account</Text>
            <Text style={styles.sessionMetaValue}>{codexLabel}</Text>
          </View>
          <View style={styles.sessionMetaPill}>
            <Text style={styles.sessionMetaLabel}>Trusted Macs</Text>
            <Text style={styles.sessionMetaValue}>{machineCount}</Text>
          </View>
        </View>
      </BlurView>
    </LinearGradient>
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

const MessageBubble = memo(function MessageBubble({
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
});

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

function PairingScannerModal({
  visible,
  granted,
  canAskAgain,
  locked,
  status,
  onClose,
  onRequestPermission,
  onScanAgain,
  onScanned,
}: {
  visible: boolean;
  granted: boolean;
  canAskAgain: boolean;
  locked: boolean;
  status: string | null;
  onClose: () => void;
  onRequestPermission: () => void;
  onScanAgain: () => void;
  onScanned: (value: string) => void;
}) {
  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.scannerScreen}>
        <View style={styles.scannerHeader}>
          <View style={styles.scannerHeaderCopy}>
            <Text style={styles.scannerEyebrow}>QR pairing</Text>
            <Text style={styles.scannerTitle}>Scan the code on your Mac</Text>
            <Text style={styles.scannerBody}>
              Offdex only accepts its own local pairing code. Nothing leaves your machine.
            </Text>
          </View>
          <Pressable style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>Close</Text>
          </Pressable>
        </View>

        {granted ? (
          <View style={styles.scannerStage}>
            <CameraView
              style={styles.scannerCamera}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={locked ? undefined : ({ data }) => onScanned(data)}
            />
            <View pointerEvents="none" style={styles.scannerFrame} />
          </View>
        ) : (
          <View style={styles.scannerFallbackCard}>
            <Text style={styles.scannerFallbackTitle}>Camera access is required</Text>
            <Text style={styles.scannerFallbackBody}>
              Grant camera access to scan the pairing QR from the bridge page on your Mac.
            </Text>
            {canAskAgain ? (
              <Pressable style={styles.connectButton} onPress={onRequestPermission}>
                <Text style={styles.connectButtonText}>Allow camera</Text>
              </Pressable>
            ) : (
              <Text style={styles.bridgeStatusText}>
                Camera access is blocked. Re-enable it in Android app settings for Expo Go.
              </Text>
            )}
          </View>
        )}

        <View style={styles.scannerFooter}>
          <Text style={styles.bridgeStatusText}>
            {status ?? "Point the camera at the Offdex QR code from your local pairing page."}
          </Text>
          {locked ? (
            <Pressable style={styles.connectButton} onPress={onScanAgain}>
              <Text style={styles.connectButtonText}>Scan again</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0b0d0c",
  },
  ambientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  ambientOrbTop: {
    position: "absolute",
    top: -120,
    right: -40,
    height: 280,
    width: 280,
    borderRadius: 999,
    backgroundColor: "rgba(214,255,114,0.1)",
  },
  ambientOrbBottom: {
    position: "absolute",
    bottom: -130,
    left: -60,
    height: 240,
    width: 240,
    borderRadius: 999,
    backgroundColor: "rgba(255,178,95,0.08)",
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
  sessionHero: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#243028",
  },
  sessionHeroBlur: {
    padding: 18,
    gap: 16,
  },
  sessionHeroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  sessionHeroCopy: {
    flex: 1,
    gap: 6,
  },
  sessionHeroEyebrow: {
    color: "#d6ff72",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  sessionHeroTitle: {
    color: "#f2f5f2",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  sessionHeroBody: {
    color: "#a4aea8",
    fontSize: 14,
    lineHeight: 21,
  },
  sessionHeroAccent: {
    marginTop: 4,
    height: 12,
    width: 12,
    borderRadius: 999,
    backgroundColor: "#6b756f",
  },
  sessionHeroAccentReady: {
    backgroundColor: "#d6ff72",
  },
  sessionHeroAccentAttention: {
    backgroundColor: "#ffb36b",
  },
  sessionHeroAccentReconnect: {
    backgroundColor: "#7bc4ff",
  },
  sessionHeroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sessionMetaPill: {
    minWidth: 120,
    flexGrow: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#202923",
    backgroundColor: "rgba(8,11,10,0.52)",
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 4,
  },
  sessionMetaLabel: {
    color: "#7b8680",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sessionMetaValue: {
    color: "#eef2ef",
    fontSize: 13,
    fontWeight: "700",
  },
  chatLayout: {
    flex: 1,
    gap: 12,
  },
  chatLayoutWide: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  threadRail: {
    maxHeight: 250,
  },
  threadRailWide: {
    maxHeight: undefined,
    width: 360,
    flexGrow: 0,
    flexShrink: 0,
  },
  threadRailContent: {
    gap: 10,
    paddingBottom: 4,
  },
  newThreadCard: {
    borderRadius: 24,
    backgroundColor: "#171c19",
    borderWidth: 1,
    borderColor: "#324138",
    padding: 16,
    gap: 8,
  },
  newThreadCardActive: {
    backgroundColor: "#1c251d",
    borderColor: "#d6ff72",
  },
  newThreadEyebrow: {
    color: "#d6ff72",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  newThreadTitle: {
    color: "#eef2ef",
    fontSize: 18,
    fontWeight: "700",
  },
  newThreadBody: {
    color: "#97a19c",
    fontSize: 14,
    lineHeight: 20,
  },
  emptyRailCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1e2421",
    backgroundColor: "#101412",
    padding: 16,
    gap: 8,
  },
  emptyRailTitle: {
    color: "#eef2ef",
    fontSize: 18,
    fontWeight: "700",
  },
  emptyRailBody: {
    color: "#97a19c",
    fontSize: 14,
    lineHeight: 20,
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
  inlineActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
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
  threadPaneWide: {
    minWidth: 0,
  },
  emptyPane: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    gap: 10,
  },
  emptyPaneEyebrow: {
    color: "#d6ff72",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  emptyPaneTitle: {
    color: "#eef2ef",
    fontSize: 28,
    fontWeight: "700",
  },
  emptyPaneBody: {
    color: "#97a19c",
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 8,
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
  readinessCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#233028",
    backgroundColor: "#101412",
    padding: 16,
    gap: 7,
  },
  readinessEyebrow: {
    color: "#d6ff72",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  readinessTitle: {
    color: "#eef2ef",
    fontSize: 18,
    fontWeight: "700",
  },
  readinessBody: {
    color: "#97a19c",
    fontSize: 14,
    lineHeight: 21,
  },
  newThreadPanel: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#233028",
    backgroundColor: "#101412",
    padding: 16,
    gap: 8,
  },
  newThreadPanelEyebrow: {
    color: "#d6ff72",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  newThreadPanelTitle: {
    color: "#eef2ef",
    fontSize: 18,
    fontWeight: "700",
  },
  newThreadPanelBody: {
    color: "#97a19c",
    fontSize: 14,
    lineHeight: 21,
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
  stopButton: {
    backgroundColor: "#ff8a63",
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
  guideCard: {
    borderRadius: 28,
    backgroundColor: "#171c19",
    borderWidth: 1,
    borderColor: "#324138",
    padding: 18,
    gap: 8,
  },
  guideEyebrow: {
    color: "#d6ff72",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  guideTitle: {
    color: "#eef2ef",
    fontSize: 24,
    fontWeight: "700",
  },
  guideBody: {
    color: "#97a19c",
    fontSize: 14,
    lineHeight: 21,
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
  scanButton: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#233028",
    backgroundColor: "#101412",
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignSelf: "flex-start",
  },
  scanButtonText: {
    color: "#d6ff72",
    fontSize: 13,
    fontWeight: "800",
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
  machineList: {
    gap: 12,
  },
  machineCard: {
    borderRadius: 24,
    backgroundColor: "#101412",
    borderWidth: 1,
    borderColor: "#1f2522",
    padding: 16,
    gap: 10,
  },
  machineCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  machineCardCopy: {
    flex: 1,
    gap: 4,
  },
  machineCardTitle: {
    color: "#eef2ef",
    fontSize: 17,
    fontWeight: "700",
  },
  machineCardMeta: {
    color: "#8e9893",
    fontSize: 13,
    textTransform: "capitalize",
  },
  machineCardBody: {
    color: "#97a19c",
    fontSize: 14,
    lineHeight: 20,
  },
  machineCardPath: {
    color: "#d6ff72",
    fontSize: 12,
    fontWeight: "700",
  },
  machineActionButton: {
    borderRadius: 999,
    backgroundColor: "#d6ff72",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  machineActionButtonDisabled: {
    opacity: 0.45,
  },
  machineActionButtonText: {
    color: "#0b0d0c",
    fontSize: 13,
    fontWeight: "800",
  },
  hintChip: {
    borderRadius: 18,
    backgroundColor: "#0d0f0e",
    borderWidth: 1,
    borderColor: "#1d2320",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hintChipActive: {
    borderColor: "#d6ff72",
    backgroundColor: "#1a2119",
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
  scannerScreen: {
    flex: 1,
    backgroundColor: "#0b0d0c",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 16,
  },
  scannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  scannerHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  scannerEyebrow: {
    color: "#d6ff72",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  scannerTitle: {
    color: "#eef2ef",
    fontSize: 28,
    fontWeight: "700",
  },
  scannerBody: {
    color: "#97a19c",
    fontSize: 14,
    lineHeight: 21,
  },
  scannerStage: {
    flex: 1,
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1f2522",
    backgroundColor: "#131715",
    justifyContent: "center",
  },
  scannerCamera: {
    flex: 1,
  },
  scannerFrame: {
    position: "absolute",
    top: "22%",
    left: "13%",
    right: "13%",
    bottom: "22%",
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#d6ff72",
    backgroundColor: "transparent",
  },
  scannerFallbackCard: {
    flex: 1,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#1f2522",
    backgroundColor: "#131715",
    padding: 24,
    justifyContent: "center",
    gap: 12,
  },
  scannerFallbackTitle: {
    color: "#eef2ef",
    fontSize: 22,
    fontWeight: "700",
  },
  scannerFallbackBody: {
    color: "#97a19c",
    fontSize: 15,
    lineHeight: 23,
  },
  scannerFooter: {
    gap: 12,
  },
});
