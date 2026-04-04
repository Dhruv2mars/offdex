import { NativeModule, requireNativeModule } from 'expo';

import { LaunchIntentModuleEvents } from './LaunchIntent.types';

declare class LaunchIntentModule extends NativeModule<LaunchIntentModuleEvents> {
  consumePendingUrl(): string | null;
  peekPendingUrl(): string | null;
}

export default requireNativeModule<LaunchIntentModule>('LaunchIntent');
