import { NativeModule, requireNativeModule } from 'expo';

import { LaunchIntentEventPayload, LaunchIntentModuleEvents } from './LaunchIntent.types';

declare class LaunchIntentModule extends NativeModule<LaunchIntentModuleEvents> {
  consumePendingUrl(): string | null;
  peekPendingUrl(): string | null;
}

type LaunchIntentModuleShape = LaunchIntentModule & {
  addListener(
    eventName: keyof LaunchIntentModuleEvents,
    listener: (payload: LaunchIntentEventPayload) => void
  ): { remove(): void };
};

const fallbackModule: LaunchIntentModuleShape = {
  addListener() {
    return { remove() {} };
  },
  consumePendingUrl() {
    return null;
  },
  peekPendingUrl() {
    return null;
  },
} as unknown as LaunchIntentModuleShape;

function loadLaunchIntentModule() {
  try {
    return requireNativeModule<LaunchIntentModule>("LaunchIntent") as LaunchIntentModuleShape;
  } catch {
    return fallbackModule;
  }
}

export default loadLaunchIntentModule();
