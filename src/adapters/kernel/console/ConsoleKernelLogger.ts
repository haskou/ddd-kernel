import type { KernelLogger } from '../../../contracts/index.js';

export class ConsoleKernelLogger implements KernelLogger {
  public debug(message: string): void {
    // eslint-disable-next-line no-console
    console.debug(message);
  }

  public error(message: string): void {
    // eslint-disable-next-line no-console
    console.error(message);
  }

  public info(message: string): void {
    // eslint-disable-next-line no-console
    console.info(message);
  }

  public warn(message: string): void {
    // eslint-disable-next-line no-console
    console.warn(message);
  }
}
