import { API, Characteristic, Formats, Perms, Service } from 'homebridge';

const DISPLAY_NAME = 'Current Scene';
const UUID = '290E9D33-0EFC-4640-891E-CC25AAD740EA';

export function attachCharacteristic_CurrentScene(target: Service, api: API): Characteristic {
  let result: Characteristic;

  if (target.testCharacteristic(DISPLAY_NAME)) {
    result = target.getCharacteristic(DISPLAY_NAME)!; // Already tested it exists
  } else {
    result = target.addCharacteristic(new api.hap.Characteristic(DISPLAY_NAME, UUID, {
      format: Formats.UINT8,
      //unit: '',
      minValue: 0,
      maxValue: 0,
      minStep: 1,
      perms: [Perms.PAIRED_WRITE, Perms.PAIRED_READ, Perms.NOTIFY],
    }));
  }

  return result;
}