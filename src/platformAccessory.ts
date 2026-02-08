import { CharacteristicValue, PlatformAccessory, Service, API } from 'homebridge';
import MultiTapSwitchPlatform from './platform';
import { AccessoryState, DeviceConfig } from './config';
import { Logging } from './helper/logger';
import { VERSION } from './settings';
import { attachCharacteristic_ConfiguredScenes } from './types/characteristicConfiguredScenes';
import { attachCharacteristic_TriggerTimeout } from './types/characteristicTimeout';
import { attachCharacteristic_CurrentScene } from './types/characteristicCurrentScene';

/**
 * Platform Accessory
 */
export class DeviceAccessory {
  private serviceIn: Service;
  private serviceOut: Service;

  private readonly singleButtonEvents;

  private readonly State: AccessoryState;
  private readonly Config: DeviceConfig;

  private readonly TriggerButtons: Service[] = [];
  private SwitchResetTimer: NodeJS.Timeout | undefined;
  private SwitchOn: boolean = false;
  private NextItemToTrigger: number = 0;

  private Log: Logging;

  /**
   * Construct the accessory services
   * @param platform Parent Homebridge platform
   * @param api Parent platform API
   * @param accessory Accessory to which these services will be attached
   */
  constructor(
    private readonly platform: MultiTapSwitchPlatform,
    private readonly api: API,
    private readonly accessory: PlatformAccessory,
  ) {
    this.singleButtonEvents = {
      minValue: this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
      maxValue: this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
      validValues: [
        this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
      ],
    };

    this.Config = new DeviceConfig(accessory.context.config);
    this.State = this.accessory.context.persistent;

    this.Log = new Logging(platform.log, this.Config.Name(), this.Config.isLogging());
    this.Log.log('Initialize Accessory ->', this.Config.Name());

    /**
     * Accessory information
     */
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'HB/dtw')
      .setCharacteristic(this.platform.Characteristic.Model, 'Multi-Tap-Switch')
      .setCharacteristic(this.platform.Characteristic.Version, VERSION)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.Config.Name());

    /**
     * Input Service / Switch
     */
    // Get or Create the input switch service
    this.serviceIn = this.accessory.getService(this.platform.Service.Switch)
      || this.accessory.addService(this.platform.Service.Switch);

    // Register handlers for the On/Off Characteristic
    this.serviceIn.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    // Register handlers for the NumScenes characteristic & restore previous value
    if (this.State.numberConfiguredScenes > this.Config.NumOfScenes()) {
      this.State.numberConfiguredScenes = this.Config.NumOfScenes();
    }
    attachCharacteristic_ConfiguredScenes(this.serviceIn, this.api)
      .setProps({
        'minValue': 1,
        'maxValue': this.Config.NumOfScenes(),
        'minStep': 1,
      })
      .onSet(this.setItemsToHandle.bind(this))
      .onGet(this.getItemsToHandle.bind(this))
      .updateValue(this.State.numberConfiguredScenes);

    // Register handlers for the TriggerTimeout characteristic & restore previous value
    if (!this.State.triggerTimeoutManuallyChanged) {
      this.State.triggerTimeout = this.Config.TriggerTimeout();
    } else {
      this.Log.debug('Current Trigger Timeout [' + this.State.triggerTimeout + '] differs from configured value [' +
        this.Config.TriggerTimeout() + ']. It won\'t be updated until it\'s equal again.');
    }
    attachCharacteristic_TriggerTimeout(this.serviceIn, this.api)
      .setProps({
        'minValue': 0,
        'maxValue': 30,
        'minStep': 1,
      })
      .onSet(this.setTriggerTimeout.bind(this))
      .onGet(this.getTriggerTimeout.bind(this))
      .updateValue(this.State.triggerTimeout);

    // Register handlers for the CurrentScene characteristic & restore previous value
    attachCharacteristic_CurrentScene(this.serviceIn, this.api)
      .setProps({
        'minValue': 1,
        'maxValue': this.Config.NumOfScenes(),
        'minStep': 1,
      })
      .onSet(this.setCurrentScene.bind(this))
      .onGet(this.getCurrentScene.bind(this))
      .updateValue(this.NextItemToTrigger);

    // Set the service name, this is what is displayed as the default name on the Home app
    this.serviceIn.setCharacteristic(this.platform.Characteristic.Name, this.Config.Name());

    /**
     * Output Service / Service Label & Stateless Programmable Switches
     */
    // Get or Create the output service (excluding the buttons)
    this.serviceOut = this.accessory.getService(this.platform.Service.ServiceLabel)
      || this.accessory.addService(this.platform.Service.ServiceLabel);
    this.serviceOut.setCharacteristic(this.platform.Characteristic.ServiceLabelNamespace, 1);

    // Create max configured number of programmable switches
    for (let i = 1; i <= this.Config.NumOfScenes(); i++) {
      this.Log.debug('Handle Scene Button -> ', i);

      let newButton = this.accessory.getService('Scene ' + i);
      if (!newButton) {
        this.Log.debug('Add new Button');
        newButton = this.accessory.addService(this.platform.Service.StatelessProgrammableSwitch, 'Scene ' + i, 'scene' + i);

        this.serviceOut.addLinkedService(newButton);
        newButton.getCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent)
          .setProps(this.singleButtonEvents);
        newButton
          .setCharacteristic(this.platform.Characteristic.ServiceLabelIndex, i)
          .setCharacteristic(this.platform.Characteristic.Name, 'Scene ' + i);
      }

      // Push switches to an internal list for later use
      this.TriggerButtons.push(newButton);
    }

    // Remove any programmable switches, that exceed the maximum of configured switches
    for (let i = this.TriggerButtons.length + 1;; i++) {
      const exButton = this.accessory.getService('Scene ' + i);
      if (exButton) {
        this.Log.debug('Remove Scene Button -> ', i);
        this.serviceOut.removeLinkedService(exButton);
        accessory.removeService(exButton);
      } else {
        break;
      }
    }

    // Set the service name, this is what is displayed as the default name on the Home app
    this.serviceOut.setCharacteristic(this.platform.Characteristic.Name, this.Config.Name());
  }

  /**
   * Trigger/Fire the next programmable switch event
   */
  triggerNext() {
    if (this.NextItemToTrigger >= this.State.numberConfiguredScenes) {
      this.NextItemToTrigger = 0;
    }

    // Trigger Scene Button
    this.Log.log('Trigger Event -> ', this.NextItemToTrigger);
    this.TriggerButtons[this.NextItemToTrigger++].updateCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, 0);
  }

  /**
   * Reset the trigger mechanism
   */
  resetTrigger() {
    this.Log.log('Reset Scene Trigger');
    this.serviceIn.updateCharacteristic(this.platform.Characteristic.On, this.SwitchOn = false);
    this.NextItemToTrigger = 0;
  }

  /**
   * Handle state changes of the input switch
   * This function does all the necessary work.
   * @param value Target switch state from Automation or manual state change
   */
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.SwitchOn = value as boolean;

    if (this.SwitchOn) {
      if (this.SwitchResetTimer) {
        clearTimeout(this.SwitchResetTimer);
      }

      // Start the reset timer, if parameter is greater than 0.
      // Otherwise, do nothing.
      if (this.State.triggerTimeout > 0) {
        this.SwitchResetTimer = setTimeout(this.resetTrigger.bind(this), this.State.triggerTimeout * 1000);
      }

      // Trigger Scene
      this.triggerNext();
    } else if (this.Config.isResetWhenOff() && !this.SwitchOn) {
      if (this.SwitchResetTimer) {
        clearTimeout(this.SwitchResetTimer);
      }
      this.resetTrigger();
    }

    this.Log.debug('Set Switch State ->', value);
  }

  /**
   * Report state of the input switch back to HomeKit (for visualization)
   */
  async getOn(): Promise<CharacteristicValue> {
    const isOn = this.SwitchOn;
    this.Log.debug('Get Switch State ->', isOn);
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    return isOn;
  }

  /**
   * Set the number of active switches.
   * The final value is limited to the maximum configured number of programmable switches.
   * @param value Number of active switches
   */
  async setItemsToHandle(value: CharacteristicValue) {
    let numItemsToHandle = value as number;

    if ((numItemsToHandle > 0) && (numItemsToHandle <= this.Config.NumOfScenes())) {
      this.Log.log('Set number of Active Switches ->', numItemsToHandle);
    } else {
      this.Log.warn(
        'Set number of Active Switches ->', numItemsToHandle, '-> Out-of-Range / Value must be between 1 and', this.Config.NumOfScenes());
      if (numItemsToHandle > this.Config.NumOfScenes()) {
        numItemsToHandle = this.Config.NumOfScenes();
      } else {
        numItemsToHandle = 1;
      }
    }

    this.State.numberConfiguredScenes = numItemsToHandle;
  }

  /**
   * Report number of active switches back to HomeKit (for visualization)
   */
  async getItemsToHandle(): Promise<CharacteristicValue> {
    const numItemsToHandle = this.State.numberConfiguredScenes;
    this.Log.debug('Get Number of Active Switches ->', numItemsToHandle);
    return numItemsToHandle;
  }

  /**
   * Set the timeout before resetting the trigger counter.
   * @param value Time in seconds
   */
  async setTriggerTimeout(value: CharacteristicValue) {
    let triggerTimeout = value as number;

    if (triggerTimeout >= 0) {
      this.Log.log('Set Trigger Timeout ->', triggerTimeout);
    } else {
      this.Log.warn(
        'Set Trigger Timeout ->', triggerTimeout, '-> Out-of-Range / Value must be greater or equal to 0');
      triggerTimeout = 0;
    }

    this.State.triggerTimeoutManuallyChanged = (this.Config.TriggerTimeout() !== triggerTimeout);
    if (!this.State.triggerTimeoutManuallyChanged) {
      this.Log.debug('Trigger Timeout in sync with config.');
    } else {
      this.Log.warn('Trigger Timeout not in sync with config value [' + this.Config.TriggerTimeout() + '].');
      this.Log.warn('It will not be updated by config changes, until it is in sync again!');
    }

    this.State.triggerTimeout = triggerTimeout;
  }

  /**
   * Report the timeout before resetting the trigger back to HomeKit (for visualization)
   */
  async getTriggerTimeout(): Promise<CharacteristicValue> {
    const triggerTimeout = this.State.triggerTimeout;
    this.Log.debug('Get Trigger Timeout ->', triggerTimeout);
    return triggerTimeout;
  }

  /**
   * Set the number of active switches.
   * The final value is limited to the maximum configured number of programmable switches.
   * @param value Number of active switches
   */
  async setCurrentScene(value: CharacteristicValue) {
    let currentScene = value as number;

    if ((currentScene > 0) && (currentScene <= this.Config.NumOfScenes())) {
      this.Log.log('Set current active scene ->', currentScene);
    } else {
      this.Log.warn(
        'Set current scene ->', currentScene, '-> Out-of-Range / Value must be between 1 and', this.Config.NumOfScenes());
      if (currentScene > this.Config.NumOfScenes()) {
        currentScene = this.Config.NumOfScenes();
      } else {
        currentScene = 1;
      }
    }

    // value must be corrected by one, because it's used as array index
    this.NextItemToTrigger = currentScene - 1;
  }

  /**
   * Report number of active switches back to HomeKit (for visualization)
   */
  async getCurrentScene(): Promise<CharacteristicValue> {
    const currentScene = this.NextItemToTrigger + 1;
    this.Log.debug('Get Number of current scene ->', currentScene);
    return currentScene;
  }
}
