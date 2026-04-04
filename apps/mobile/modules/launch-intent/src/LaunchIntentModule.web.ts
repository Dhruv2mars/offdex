import { registerWebModule, NativeModule } from 'expo';

import type { LaunchIntentModuleEvents } from './LaunchIntent.types';

class LaunchIntentModule extends NativeModule<LaunchIntentModuleEvents> {
  consumePendingUrl(): string | null {
    return null;
  }

  peekPendingUrl(): string | null {
    return null;
  }
}

export default registerWebModule(LaunchIntentModule, 'LaunchIntent');
