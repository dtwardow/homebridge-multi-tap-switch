import { Formats, Perms } from 'homebridge';

export = (homebridge) => {
  const CustomCharacteristic = homebridge.hap.Characteristic;
  const characteristicUUID = 'E2C19A02-1D2F-F592-A2BF-BF920014FB18';

  return class TriggerTimeout extends CustomCharacteristic {
    public static readonly UUID: string = characteristicUUID;

    constructor() {
      super('Trigger Timeout', TriggerTimeout.UUID, {
        format: Formats.UINT16,
        //unit: '',
        minValue: 0,
        maxValue: 60,
        minStep: 1,
        perms: [Perms.PAIRED_WRITE, Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  };
};
