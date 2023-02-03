import { Formats, Perms } from 'homebridge';

export = (homebridge) => {
  const CustomCharacteristic = homebridge.hap.Characteristic;
  const characteristicUUID = 'A8E3F4DF-5E5D-6A7F-8FA7-A22FA5AE9F53';

  return class ConfiguredScenes extends CustomCharacteristic {
    public static readonly UUID: string = characteristicUUID;

    constructor() {
      super('Configured Scenes', ConfiguredScenes.UUID, {
        format: Formats.UINT8,
        //unit: '',
        minValue: 0,
        maxValue: 0,
        minStep: 1,
        perms: [Perms.PAIRED_WRITE, Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  };
};
