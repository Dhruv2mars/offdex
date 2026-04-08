import { useState, useCallback, useEffect } from "react";
import { StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { X, Camera, FlashlightOff, Flashlight, RefreshCw } from "../lib/icons";

import { View, Text, Pressable } from "../lib/tw";
import { cn } from "../lib/utils";
import { useWorkspaceStore } from "../lib/store";
import { extractOffdexPairingUri } from "../src/pairing-scan";
import { feedbackSelection, feedbackSuccess, feedbackError, feedbackWarning } from "../src/feedback";

import { Button } from "../components/ui/button";

// ════════════════════════════════════════════════════════════════════════════
// QR Scanner Screen
// ════════════════════════════════════════════════════════════════════════════

export default function PairScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [torch, setTorch] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Actions
  const connectFromPairingUri = useWorkspaceStore((s) => s.connectFromPairingUri);

  const handleClose = useCallback(() => {
    void feedbackSelection();
    router.back();
  }, [router]);

  const handleBarCodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (!isScanning || isConnecting) return;

      const pairingUri = extractOffdexPairingUri(result.data);
      if (!pairingUri) {
        // Not a valid Offdex pairing URI
        return;
      }

      setIsScanning(false);
      setIsConnecting(true);
      void feedbackSuccess();

      try {
        await connectFromPairingUri(pairingUri);
        void feedbackSuccess();
        router.replace("/");
      } catch (error) {
        void feedbackError();
        Alert.alert(
          "Connection Failed",
          "Could not connect to the Mac. Please try scanning again.",
          [
            {
              text: "Try Again",
              onPress: () => {
                setIsScanning(true);
                setIsConnecting(false);
              },
            },
            {
              text: "Cancel",
              style: "cancel",
              onPress: handleClose,
            },
          ]
        );
      }
    },
    [isScanning, isConnecting, connectFromPairingUri, router, handleClose]
  );

  const toggleTorch = useCallback(() => {
    void feedbackSelection();
    setTorch((t) => !t);
  }, []);

  // Request permission on mount
  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  // Permission denied
  if (permission && !permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable
            onPress={handleClose}
            className="h-10 w-10 items-center justify-center rounded-md bg-background shadow-border active:bg-muted"
          >
            <X size={20} color="#171717" />
          </Pressable>
          <Text className="text-base font-semibold text-foreground">
            Trust camera
          </Text>
          <View className="w-10" />
        </View>

        <View className="flex-1 justify-center px-4">
          <View className="rounded-lg bg-foreground p-5">
            <Text className="font-mono text-xs uppercase text-background/60">
              Pair a new machine
            </Text>
            <Text className="mt-8 text-3xl font-semibold text-background">
              Camera access creates the trust link.
            </Text>
            <Text className="mt-3 text-sm leading-6 text-background/60">
              Offdex only scans the QR payload printed by offdex start on your Mac.
            </Text>
          </View>

          <View className="mt-4 rounded-lg bg-card p-5 shadow-card">
            <View className="mb-6 h-16 w-16 items-center justify-center rounded-lg bg-muted shadow-border">
            <Camera size={36} color="#4d4d4d" />
          </View>
          <Text className="text-xl font-semibold text-foreground">
            Grant camera access
          </Text>
          <Text className="mb-6 mt-2 text-sm leading-6 text-muted-foreground">
            Scan the pairing QR code and store this device as trusted.
          </Text>
          <Button variant="primary" onPress={requestPermission}>
            <Camera size={18} color="#ffffff" />
            <Text className="text-sm font-semibold text-primary-foreground ml-2">
              Grant Camera Access
            </Text>
          </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Camera View */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
      />

      {/* Overlay */}
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable
            onPress={handleClose}
            className="h-10 w-10 items-center justify-center rounded-md bg-black/50 active:bg-black/70"
          >
            <X size={20} color="#ffffff" />
          </Pressable>
          <View className="items-center">
            <Text className="text-base font-semibold text-white">
              Trust this Mac
            </Text>
            <Text className="font-mono text-[10px] uppercase text-white/60">
              QR pairing
            </Text>
          </View>
          <Pressable
            onPress={toggleTorch}
            className="h-10 w-10 items-center justify-center rounded-md bg-black/50 active:bg-black/70"
          >
            {torch ? (
              <Flashlight size={20} color="#ffffff" />
            ) : (
              <FlashlightOff size={20} color="#ffffff" />
            )}
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center">
          <View className="relative h-72 w-72 rounded-lg border border-white/70 bg-black/10">
            <View className="absolute left-5 right-5 top-1/2 h-px bg-white/60" />
            <View className="absolute bottom-5 top-5 left-1/2 w-px bg-white/60" />

            {isConnecting && (
              <View className="absolute inset-0 items-center justify-center rounded-lg bg-black/70">
                <RefreshCw size={32} color="#ffffff" className="animate-spin" />
                <Text className="text-sm text-white mt-3">Connecting...</Text>
              </View>
            )}
          </View>
        </View>

        <View className="px-8 pb-8">
          <View className="rounded-lg bg-white px-5 py-4">
            <Text className="font-mono text-[10px] uppercase text-muted-foreground">
              Pairing source
            </Text>
            <Text className="mt-2 text-sm leading-6 text-foreground">
              Point your camera at the QR code printed by{" "}
              <Text className="font-mono">offdex start</Text>.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
