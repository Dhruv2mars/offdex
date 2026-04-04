import { NativeModule, requireNativeModule } from 'expo';

import { LaunchIntentModuleEvents } from './LaunchIntent.types';

declare class LaunchIntentModule extends NativeModule<LaunchIntentModuleEvents> {
  consumePendingUrl(): string | null;
  peekPendingUrl(): string | null;
}

type LaunchIntentModuleShape = LaunchIntentModule & {
  addListener: NativeModule<LaunchIntentModuleEvents>["addListener"];
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
} as LaunchIntentModuleShape;

function loadLaunchIntentModule() {
  try {
    return requireNativeModule<LaunchIntentModule>("LaunchIntent") as LaunchIntentModuleShape;
  } catch {
    return fallbackModule;
  }
}

export default loadLaunchIntentModule();
