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
        router.replace("/(tabs)");
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
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable
            onPress={handleClose}
            className="w-10 h-10 items-center justify-center rounded-full bg-muted active:bg-muted/80 shadow-border"
          >
            <X size={20} color="#171717" />
          </Pressable>
          <Text className="text-base font-semibold text-foreground">
            Scan QR Code
          </Text>
          <View className="w-10" />
        </View>

        {/* Permission Request */}
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-lg bg-card items-center justify-center mb-6 shadow-card">
            <Camera size={36} color="#4d4d4d" />
          </View>
          <Text className="text-xl font-semibold text-foreground text-center mb-2">
            Camera Access Required
          </Text>
          <Text className="text-sm text-muted-foreground text-center leading-relaxed mb-6">
            We need access to your camera to scan the pairing QR code from your Mac.
          </Text>
          <Button variant="primary" onPress={requestPermission}>
            <Camera size={18} color="#ffffff" />
            <Text className="text-sm font-semibold text-primary-foreground ml-2">
              Grant Camera Access
            </Text>
          </Button>
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
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable
            onPress={handleClose}
            className="w-10 h-10 items-center justify-center rounded-full bg-black/50 active:bg-black/70"
          >
            <X size={20} color="#ffffff" />
          </Pressable>
          <Text className="text-base font-semibold text-white">
            Scan QR Code
          </Text>
          <Pressable
            onPress={toggleTorch}
            className="w-10 h-10 items-center justify-center rounded-full bg-black/50 active:bg-black/70"
          >
            {torch ? (
              <Flashlight size={20} color="#ffffff" />
            ) : (
              <FlashlightOff size={20} color="#ffffff" />
            )}
          </Pressable>
        </View>

        {/* Scanner Frame */}
        <View className="flex-1 items-center justify-center">
          <View className="relative w-64 h-64">
            {/* Corner Markers */}
            <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
            <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
            <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
            <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />

            {/* Connecting Overlay */}
            {isConnecting && (
              <View className="absolute inset-0 items-center justify-center bg-black/60 rounded-xl">
                <RefreshCw size={32} color="#ffffff" className="animate-spin" />
                <Text className="text-sm text-white mt-3">Connecting...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Instructions */}
        <View className="px-8 pb-8">
          <View className="bg-black/60 rounded-2xl px-6 py-4">
            <Text className="text-sm text-white text-center leading-relaxed">
              Point your camera at the QR code displayed by{" "}
              <Text className="font-mono bg-white/20 px-1 rounded">offdex start</Text>
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
