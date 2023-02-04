import {Logger} from 'homebridge';

export class Logging {
  private readonly logHandler: Logger;
  private readonly prefix: string;
  private readonly isDebug: boolean;

  constructor(
    log: Logger,
    prefix: string,
    isDebug: boolean,
  ) {
    this.logHandler = log;
    this.prefix = prefix;
    this.isDebug = isDebug;
  }

  private msgPrefix() {
    return '[' + this.prefix + ']';
  }

  log(...parts: any) {
    this.isDebug ?
      this.logHandler.info(this.msgPrefix(), ...parts) :
      this.logHandler.debug(this.msgPrefix(), ...parts);
  }

  warn = (...parts: any) => this.logHandler.warn(this.msgPrefix(), ...parts);
  error = (...parts: any) => this.logHandler.error(this.msgPrefix(), ...parts);
  debug = (...parts: any) => this.logHandler.debug(this.msgPrefix(), ...parts);
}