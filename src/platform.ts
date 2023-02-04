import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { DeviceAccessory } from './platformAccessory';

// Necessary definitions for custom characteristics!
import ConfiguredScenes from './types/characteristicConfiguredScenes';
let IConfiguredScenes;
import TriggerTimeout from './types/characteristicTimeout';
let ITriggerTimeout;

interface PlatformConfigData {
  Name: string;
  MaxNumScenes: number;
  SecondsBeforeReset: number;
}

/**
 * HomebridgePlatform
 */
export class MultiTapSwitchPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic & typeof IConfiguredScenes & typeof ITriggerTimeout;

  private readonly CharacteristicConfiguredScenes;
  private readonly CharacteristicTriggerTimeout;

  // Track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    this.CharacteristicConfiguredScenes = ConfiguredScenes(this.api);
    IConfiguredScenes = this.CharacteristicConfiguredScenes;
    this.CharacteristicTriggerTimeout = TriggerTimeout(this.api);
    ITriggerTimeout = this.CharacteristicTriggerTimeout;

    this.api.on('didFinishLaunching', () => {
      log.debug('Discover/Register Devices ...');
      this.discoverDevices();
    });

    this.Characteristic = Object.defineProperty(this.api.hap.Characteristic,
      'ConfiguredScenes',
      {value: this.CharacteristicConfiguredScenes});
    this.Characteristic = Object.defineProperty(this.api.hap.Characteristic,
      'TriggerTimeout',
      {value: this.CharacteristicTriggerTimeout});
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  defineUuid(name: string | undefined, serial = 'UNDEF'): string {
    return this.api.hap.uuid.generate(name + '_' + serial);
  }

  discoverDevices() {
    for (let i = 0; i < this.config.devices.length; i++) {
      const accessoryConfig: PlatformConfigData = {
        Name: this.config.devices[i].name,
        MaxNumScenes: this.config.devices[i].numScenes,
        SecondsBeforeReset: this.config.devices[i].secondsToKeep,
      };

      const uuid = this.defineUuid(accessoryConfig.Name, '0');

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // Accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        // existingAccessory.context.device = device;
        // this.api.updatePlatformAccessories([existingAccessory]);
        if (existingAccessory.context.config !== accessoryConfig) {
          existingAccessory.context.config = accessoryConfig;
          this.api.updatePlatformAccessories([existingAccessory]);
        }

        // Create the accessory handler for the restored accessory
        // This is imported from `platformAccessory.ts`
        new DeviceAccessory(this, existingAccessory);
      } else {
        // Accessory does not yet exist, so we need to create it
        this.log.info('Adding INPUT:', accessoryConfig.Name, ' / Max ',
          accessoryConfig.MaxNumScenes, ' scenes / ', accessoryConfig.SecondsBeforeReset, ' seconds before reset');

        // Create new accessory
        const accessory = new this.api.platformAccessory(accessoryConfig.Name, uuid);

        // Store config in accessory context
        accessory.context.config = accessoryConfig;

        // Create the accessory handler for the new  accessory
        // This is imported from `platformAccessory.ts`
        new DeviceAccessory(this, accessory);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}
