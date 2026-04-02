import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

async function run(effect: () => Promise<void>) {
  if (Platform.OS === "web") {
    return;
  }

  await effect().catch(() => {});
}

export function feedbackSelection() {
  return run(() => Haptics.selectionAsync());
}

export function feedbackSuccess() {
  return run(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  );
}

export function feedbackError() {
  return run(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  );
}

export function feedbackWarning() {
  return run(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  );
}
