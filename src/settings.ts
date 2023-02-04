// eslint-disable-next-line @typescript-eslint/no-var-requires
const package_config = require('../package.json');

/**
 * This is the name of the platform that users will use to register the plugin in the Homebridge config.json
 */
export const PLATFORM_NAME = 'MultiTapSwitch';

/**
 * This must match the name of your plugin as defined the package.json
 */
export const PLUGIN_NAME = 'homebridge-multitap-switch';

export const VERSION = package_config.version;
