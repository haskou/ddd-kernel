import type { Scheduler } from './Scheduler.js';
import type { SchedulerErrorPolicy } from './SchedulerErrorPolicy.js';

import { Kernel } from '../../Kernel.js';
import { ScheduledExecutionError } from './ScheduledExecutionError.js';

export class DefaultSchedulerErrorPolicy implements SchedulerErrorPolicy {
  public handle(error: unknown, scheduler: Scheduler): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const scheduledError = new ScheduledExecutionError(
      `Error on ${scheduler.getProcessName()}: ${errorMessage}`,
    );

    Kernel.logger.error(scheduledError.message);
  }

  public shouldSkip(): boolean {
    return false;
  }
}

export default DefaultSchedulerErrorPolicy;
