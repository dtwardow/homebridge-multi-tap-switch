import { PlatformConfig } from 'homebridge';

const DEFAULT_NUM_OF_CONFIGURED_SCENES = 5;
const DEFAULT_TRIGGER_TIMEOUT = 10;
const DEFAULT_RESET_AFTER_SWITCH_OFF = false;
const DEFAULT_LOGGING = false;

export interface PluginDeviceConfig {
  readonly name: string;
  readonly numberConfiguredScenes?: number;
  readonly triggerTimeout?: number;
  readonly resetAfterSwitchOff?: boolean;
  readonly logging?: boolean;
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

  isLogging(): boolean {
    return this.device.logging
      || DEFAULT_LOGGING;
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
