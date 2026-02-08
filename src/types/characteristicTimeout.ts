import { API, Characteristic, Formats, Perms, Service } from 'homebridge';

const DISPLAY_NAME = 'Trigger Timeout';
const UUID = 'E2C19A02-1D2F-F592-A2BF-BF920014FB18';

export function attachCharacteristic_TriggerTimeout(target: Service, api: API): Characteristic {
  let result: Characteristic;

  if (target.testCharacteristic(DISPLAY_NAME)) {
    result = target.getCharacteristic(DISPLAY_NAME)!; // Already tested it exists
  } else {
    result = target.addCharacteristic(new api.hap.Characteristic(DISPLAY_NAME, UUID, {
      format: Formats.UINT16,
      //unit: '',
      minValue: 0,
      maxValue: 60,
      minStep: 1,
      perms: [Perms.PAIRED_WRITE, Perms.PAIRED_READ, Perms.NOTIFY],
    }));
  }

  return result;
}
