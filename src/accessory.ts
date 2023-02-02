import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { MultiTapSwitchPlatform } from './platform';
import {TIMEOUT} from 'dns';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
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

  private currentState = {
    "On": Boolean,
    "NumScenes": Number,
    "KeepSeconds":  Number,
    "Timeout": TIMEOUT
  };

  private readonly triggerButtons: Service[] = [];

  constructor(
    private readonly platform: MultiTapSwitchPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly numOfButtons: number,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'TippyTapper Solutions')
      .setCharacteristic(this.platform.Characteristic.Model, 'SceneButton-000')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'DE:AD:BE:EF:00:00');


    this.serviceIn = this.accessory.getService(this.platform.Service.Switch)
      || this.accessory.addService(this.platform.Service.Switch);

    this.serviceOut = this.accessory.getService(this.platform.Service.ServiceLabel)
      || this.accessory.addService(this.platform.Service.ServiceLabel);

    this.serviceOut.setCharacteristic(this.platform.Characteristic.ServiceLabelNamespace, '')
    this.serviceOut.setCharacteristic(this.platform.Characteristic.ServiceLabelIndex, 1);

    // Create configured number of scene buttons
    for (let i = 1; i <= numOfButtons; i++) {
      const newButton = this.accessory.addService(this.platform.Service.StatelessProgrammableSwitch);
      this.serviceOut.addLinkedService(newButton);
      this.triggerButtons.push(newButton);

      newButton.getCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent)
        .setProps(this.singleButtonEvents);
      newButton.setCharacteristic(this.platform.Characteristic.ServiceLabelIndex, i);
    }

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.serviceOut.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.exampleDisplayName);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.serviceOut.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this));               // GET - bind to the `getOn` method below

    // register handlers for the Brightness Characteristic
    this.serviceOut.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBrightness.bind(this));       // SET - bind to the 'setBrightness` method below

    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same sub type id.)
     */

    // Example: add two "motion sensor" services to the accessory
    const inputService = this.accessory.getService(this.accessory.displayName + ' Trigger') ||
        this.accessory.addService(this.platform.Service.MotionSensor, this.accessory.displayName + ' Trigger', 'YourUniqueIdentifier-1');

    const outputService = this.accessory.getService(this.accessory.displayName + ' SceneSwitch') ||
      this.accessory.addService(this.platform.Service.MotionSensor, this.accessory.displayName + ' SceneSwitch', 'YourUniqueIdentifier-2');

    /**
     * Updating characteristics values asynchronously.
     *
     * Example showing how to update the state of a Characteristic asynchronously instead
     * of using the `on('get')` handlers.
     * Here we change update the motion sensor trigger states on and off every 10 seconds
     * the `updateCharacteristic` method.
     *
     */
    let motionDetected = false;
    setInterval(() => {
      // EXAMPLE - inverse the trigger
      motionDetected = !motionDetected;

      // push the new value to HomeKit
      inputService.updateCharacteristic(this.platform.Characteristic.MotionDetected, motionDetected);
      outputService.updateCharacteristic(this.platform.Characteristic.MotionDetected, !motionDetected);

      this.platform.log.debug('Triggering motionSensorOneService:', motionDetected);
      this.platform.log.debug('Triggering motionSensorTwoService:', !motionDetected);
    }, 10000);

  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.currentState.On = value as boolean;

    this.currentState.Timeout = setTimeout(() => {
      this.currentState.On = false;
      this.setOn(false);
    }, 1000 * 10);
    this.platform.log.debug('Set Characteristic On ->', value);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getOn(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const isOn = this.currentState.On;

    this.platform.log.debug('Get Characteristic On ->', isOn);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return isOn;
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  async setBrightness(value: CharacteristicValue) {
    // implement your own code to set the brightness
    //this.currentState.KeepSeconds = value as number;

    this.platform.log.debug('Set Characteristic KeepSeconds -> ', value);
  }

}
