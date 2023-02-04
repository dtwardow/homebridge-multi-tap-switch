import {PlatformConfig} from 'homebridge';

export interface PluginBaseConfig {
  Name: string;
  Enable: boolean;
}

export interface PluginDeviceConfig {
  readonly name: string;
  readonly numberConfiguredScenes: number;
  readonly triggerTimeout: number;
  readonly resetAfterSwitchOff: boolean;
  readonly logging: boolean;
}

export class PluginConfig {
  readonly Name: string;
  readonly Enable: boolean;
  readonly Devices: PluginDeviceConfig[];

  constructor(config: PlatformConfig) {
    this.Name = config.name!;
    this.Enable = config.enable;

    this.Devices = config.devices;
  }
}

export class DeviceConfig {
  private device: PluginDeviceConfig;

  constructor(item: PluginDeviceConfig) {
    this.device = item;
  }

  Name() {
    return this.device.name;
  }

  NumOfScenes() {
    return this.device.numberConfiguredScenes;
  }

  TriggerTimeout() {
    return this.device.triggerTimeout;
  }

  isResetWhenOff() {
    return this.device.resetAfterSwitchOff;
  }

  isLogging() {
    return this.device.logging;
  }
}

export interface AccessoryState {
  numberConfiguredScenes: number;
  triggerTimeout: number;
  //nextSceneToTrigger: number;
}

export function initializeAccessoryState(initConfig: PluginDeviceConfig | AccessoryState): AccessoryState {
  return {
    numberConfiguredScenes: initConfig.numberConfiguredScenes,
    triggerTimeout: initConfig.triggerTimeout,
    //nextSceneToTrigger: 0,
  };
}
