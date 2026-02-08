import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { DeviceAccessory } from './platformAccessory';

// Necessary definitions for custom characteristics!
import { initializeAccessoryState, PluginConfig } from './config';

/**
 * HomebridgePlatform
 */
class MultiTapSwitchPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // Track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  public readonly Config: PluginConfig;

  /**
   * Construct the Homebridge platform
   * @param log Homebridge Logger
   * @param config Homebridge Configuration (from config.json)
   * @param api Homebridge API
   */
  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Config = new PluginConfig(this.config);
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.Config.Name);

    this.api.on('didFinishLaunching', () => {
      log.debug('Discover/Register Devices ...');
      this.discoverDevices();
    });
  }

  /**
   * Homebridge Accessory Configuration Callback
   * @param accessory Accessory to previously added by this platform
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Load cached Accessory:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * Calculate the UUIDs
   * @param name Name to use for the calculation
   * @param serial (optional) Provide an additional number (might be obsolete in future releases)
   */
  defineUuid(name: string | undefined, serial = 'UNDEF'): string {
    return this.api.hap.uuid.generate(PLATFORM_NAME + '_' + name + '_' + serial);
  }

  /**
   * Discover new and existing accessories
   */
  discoverDevices() {
    const knownUuids: string[] = [];

    const parsedConfig = new PluginConfig(this.config);
    for (const device of parsedConfig.Devices) {
      const uuid = this.defineUuid(device.name, '0');

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // Accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        // existingAccessory.context.device = device;
        // this.api.updatePlatformAccessories([existingAccessory]);
        if (JSON.stringify(existingAccessory.context.config) !== JSON.stringify(device)) {
          this.log.debug('Update Accessory ->', device.name);
          existingAccessory.context.config = device;
          this.api.updatePlatformAccessories([existingAccessory]);
        }

        // Create the accessory handler for the restored accessory
        // This is imported from `platformAccessory.ts`
        new DeviceAccessory(this, this.api, existingAccessory);

        knownUuids.push(uuid);
      } else {
        // Accessory does not yet exist, so we need to create it
        this.log.info('Add Device ->', device.name, '/',
          'Max', device.numberConfiguredScenes, 'scenes /',
          device.triggerTimeout, 'seconds before reset');

        // Create new accessory
        const accessory = new this.api.platformAccessory(device.name, uuid);

        // Store config in accessory context
        accessory.context.config = device;
        accessory.context.persistent = initializeAccessoryState(device);

        // Create the accessory handler for the new  accessory
        // This is imported from `platformAccessory.ts`
        new DeviceAccessory(this, this.api, accessory);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }

    // Unregister unused accessories
    for (const device of this.accessories) {
      if (!knownUuids.find(id => id === device.UUID)) {
        this.log.info('Remove unused device ->', device.displayName, '/', device.UUID);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [device]);
      }
    }
  }
}

export default MultiTapSwitchPlatform;
