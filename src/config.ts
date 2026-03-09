import { PlatformConfig } from 'homebridge';

const DEFAULT_NUM_OF_CONFIGURED_SCENES = 5;
const DEFAULT_TRIGGER_TIMEOUT = 10;
const DEFAULT_RESET_AFTER_SWITCH_OFF = false;
const DEFAULT_TRIGGER_SCENE_AFTER_SWITCH_OFF = false;
const DEFAULT_TRIGGER_SCENE_OFF = 0;
const DEFAULT_LOGGING = false;
const DEFAULT_DEBOUNCE_TIMEOUT_MS = 150;

export interface PluginDeviceConfig {
  readonly name: string;
  readonly numberConfiguredScenes?: number;
  readonly triggerTimeout?: number;
  readonly resetAfterSwitchOff?: boolean;
  readonly triggerSceneAfterSwitchOff?: boolean;
  readonly logging?: boolean;
  readonly debounceTimerMs?: number;
}

export class PluginConfig {
  readonly Name: string;
  readonly Devices: PluginDeviceConfig[];

  constructor(config: PlatformConfig) {
    this.Name = config.name!;

    this.Devices = config.devices;
  }
}

export class DeviceConfig {
  private device: PluginDeviceConfig;

  constructor(item: PluginDeviceConfig) {
    this.device = item;
  }

  Name(): string {
    return this.device.name;
  }

  NumOfScenes(): number {
    return this.device.numberConfiguredScenes
      || DEFAULT_NUM_OF_CONFIGURED_SCENES;
  }

  TriggerTimeout(): number {
    return this.device.triggerTimeout
      || DEFAULT_TRIGGER_TIMEOUT;
  }

  isResetWhenOff(): boolean {
    return this.device.resetAfterSwitchOff
      || DEFAULT_RESET_AFTER_SWITCH_OFF;
  }

  isTriggerSceneWhenOff(): boolean {
    return this.device.triggerSceneAfterSwitchOff
      || DEFAULT_TRIGGER_SCENE_AFTER_SWITCH_OFF;
  }

  // When triggerSceneAfterSwitchOff is 'true', start at 1, otherwise 0 (normal behavior)
  FirstTriggerScene(): number {
    return this.isTriggerSceneWhenOff() ? 1 : 0;
  }

  TriggerOffSceneIndex(): number {
    return DEFAULT_TRIGGER_SCENE_OFF;
  }

  isLogging(): boolean {
    return this.device.logging
      || DEFAULT_LOGGING;
  }

  DebounceTimeoutMs(): number {
    return this.device.debounceTimerMs
      || DEFAULT_DEBOUNCE_TIMEOUT_MS;
  }
}

export interface AccessoryState {
  numberConfiguredScenes: number;
  triggerTimeout: number;
  triggerTimeoutManuallyChanged: boolean;
}

export function initializeAccessoryState(initConfig: PluginDeviceConfig | AccessoryState): AccessoryState {
  return {
    numberConfiguredScenes: initConfig.numberConfiguredScenes || DEFAULT_NUM_OF_CONFIGURED_SCENES,
    triggerTimeout: initConfig.triggerTimeout || DEFAULT_TRIGGER_TIMEOUT,
    triggerTimeoutManuallyChanged: false,
  };
}
