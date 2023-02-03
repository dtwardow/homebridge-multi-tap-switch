import {CharacteristicValue, PlatformAccessory, Service} from 'homebridge';
import {MultiTapSwitchPlatform} from './platform';

interface AccessoryState {
  NumConfiguredScenes: number;
  SecondsToKeepState: number;
}

/**
 * Platform Accessory
 */
export class DeviceAccessory {
  private serviceIn: Service;
  private serviceOut: Service;

  private readonly singleButtonEvents = {
    minValue: this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
    maxValue: this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
    validValues: [
      this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
    ],
  };

  private readonly State: AccessoryState;

  private readonly TriggerButtons: Service[] = [];
  private SwitchResetTimer: NodeJS.Timeout | undefined;
  private SwitchOn = false;
  private NextItemToTrigger = 0;

  constructor(
    private readonly platform: MultiTapSwitchPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    if (this.accessory.context.persistent) {
      this.platform.log.debug('Restore previous state');
      this.State = this.accessory.context.persistent;
    } else {
      this.platform.log.debug('First run, use configuration data');
      this.State = {
        NumConfiguredScenes: accessory.context.config.MaxNumScenes,
        SecondsToKeepState: accessory.context.config.SecondsBeforeReset,
      };
    }

    // Set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'TippyTapper Solutions')
      .setCharacteristic(this.platform.Characteristic.Model, 'SceneSwitch')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'DE:AD:BE:EF:00:00');


    // Get or Create the input switch service
    this.serviceIn = this.accessory.getService(this.platform.Service.Switch)
      || this.accessory.addService(this.platform.Service.Switch);

    // register handlers for the On/Off Characteristic
    this.serviceIn.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    // Register handlers for the NumScenes characteristic & restore previous value
    if (this.State.NumConfiguredScenes > this.accessory.context.config.MaxNumScenes) {
      this.State.NumConfiguredScenes = this.accessory.context.config.MaxNumScenes;
    }
    (this.serviceIn.getCharacteristic(this.platform.Characteristic.ConfiguredScenes)
      || this.serviceIn.addOptionalCharacteristic(this.platform.Characteristic.ConfiguredScenes))
      .setProps({
        'minValue': 0,
        'maxValue': this.accessory.context.config.MaxNumScenes,
        'minStep': 1,
      })
      .onSet(this.setItemsToHandle.bind(this))
      .onGet(this.getItemsToHandle.bind(this))
      .updateValue(this.State.NumConfiguredScenes);

    // Register handlers for the TriggerTimeout characteristic & restore previous value
    (this.serviceIn.getCharacteristic(this.platform.Characteristic.TriggerTimeout)
       || this.serviceIn.addOptionalCharacteristic(this.platform.Characteristic.TriggerTimeout))
      .setProps({
        'minValue': 0,
        'maxValue': 30,
        'minStep': 1,
      })
      .onSet(this.setTriggerTimeout.bind(this))
      .onGet(this.getTriggerTimeout.bind(this))
      .updateValue(this.State.SecondsToKeepState);

    // Get or Create the output service (excluding the buttons)
    this.serviceOut = this.accessory.getService(this.platform.Service.ServiceLabel)
      || this.accessory.addService(this.platform.Service.ServiceLabel);
    this.serviceOut.setCharacteristic(this.platform.Characteristic.ServiceLabelNamespace, 1);

    // Create max configured number of scene buttons
    for (let i = 1; i <= this.accessory.context.config.MaxNumScenes; i++) {
      this.platform.log.debug('Handle Scene Button -> ', i);

      let newButton = this.accessory.getService('Scene ' + i);
      if (!newButton) {
        this.platform.log.debug('Add new Button');
        newButton = this.accessory.addService(this.platform.Service.StatelessProgrammableSwitch, 'Scene ' + i, 'scene' + i);

        this.serviceOut.addLinkedService(newButton);
        newButton.getCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent)
          .setProps(this.singleButtonEvents);
        newButton.setCharacteristic(this.platform.Characteristic.ServiceLabelIndex, i);
      }

      this.TriggerButtons.push(newButton);
    }

    // Remove buttons, if max buttons is smaller
    for (let i = this.TriggerButtons.length + 1;; i++) {
      const exButton = this.accessory.getService('Scene ' + i);
      if (exButton) {
        this.platform.log.debug('Remove Scene Button -> ', i);
        this.serviceOut.removeLinkedService(exButton);
        accessory.removeService(exButton);
      } else {
        break;
      }
    }

    // Set the service name, this is what is displayed as the default name on the Home app
    this.serviceOut.setCharacteristic(this.platform.Characteristic.Name, accessory.context.config.Name);

    // Store persistent data
    this.accessory.context.persistent = this.State;
  }

  triggerNextItem() {
    if (this.NextItemToTrigger >= this.State.NumConfiguredScenes) {
      this.NextItemToTrigger = 0;
    }

    // Trigger Scene Button
    this.platform.log.debug('Trigger Scene -> ', this.NextItemToTrigger);
    this.TriggerButtons[this.NextItemToTrigger++].updateCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, 0);
  }

  // Switch Handlers
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.SwitchOn = value as boolean;

    if (this.SwitchResetTimer) {
      clearTimeout(this.SwitchResetTimer);
    }
    if (this.SwitchOn) {
      this.SwitchResetTimer = setTimeout(() => {
        this.platform.log.debug('Reset Scene Trigger');
        this.serviceIn.updateCharacteristic(this.platform.Characteristic.On,
          this.SwitchOn = false);
        this.NextItemToTrigger = 0;
      }, this.State.SecondsToKeepState * 1000);

      // Trigger Scene
      this.triggerNextItem();
    }

    this.platform.log.debug('Set Characteristic On ->', value);
  }

  async getOn(): Promise<CharacteristicValue> {
    const isOn = this.SwitchOn;
    this.platform.log.debug('Get Characteristic On ->', isOn);
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    return isOn;
  }

  // NumScenes Handlers
  async setItemsToHandle(value: CharacteristicValue) {
    const numItemsToHandle = value as number;
    this.platform.log.debug('Set Characteristic NumScenes ->', numItemsToHandle);
    this.State.NumConfiguredScenes = numItemsToHandle;

    //this.updatePersistentData();
  }

  async getItemsToHandle(): Promise<CharacteristicValue> {
    const numItemsToHandle = this.State.NumConfiguredScenes;
    this.platform.log.debug('Get Characteristic NumScenes ->', numItemsToHandle);
    return numItemsToHandle;
  }

  // TriggerTimeout Handlers
  async setTriggerTimeout(value: CharacteristicValue) {
    const triggerTimeout = value as number;
    this.platform.log.debug('Set Characteristic TriggerTimeout ->', triggerTimeout);
    this.State.SecondsToKeepState = triggerTimeout;

    //this.updatePersistentData();
  }

  async getTriggerTimeout(): Promise<CharacteristicValue> {
    const triggerTimeout = this.State.SecondsToKeepState;
    this.platform.log.debug('Get Characteristic TriggerTimeout ->', triggerTimeout);
    return triggerTimeout;
  }
}
