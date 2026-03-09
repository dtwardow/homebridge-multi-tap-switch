import { Logging } from './logger';
import { clearTimeout } from 'node:timers';

export default class TimeoutHandler {
  private timeoutObject: NodeJS.Timeout | undefined;
  public timeoutMs: number = 0;
  private log: Logging | undefined;

  private isRunning: boolean = false;

  constructor(timeoutMs: number, logger: Logging) {
    this.log = logger;
    this.timeoutMs = timeoutMs;
  }

  public trigger(): void {
    if (!this.isRunning) {
      this.timeoutStarted();
      this.timeoutObject = setTimeout(this.timeoutTriggered.bind(this), this.timeoutMs);
    }
  }

  public cancel(): void {
    if (!this.isRunning) {
      clearTimeout(this.timeoutObject);
      this.isRunning = false;
    }
  }

  public elapsedAndTrigger(): boolean {
    if (!this.isRunning) {
      this.trigger();
      return true;
    }
    return false;
  }

  private timeoutStarted(): void {
    this.isRunning = true;
  }

  async timeoutTriggered(): Promise<void> {
    this.isRunning = false;
  }
}