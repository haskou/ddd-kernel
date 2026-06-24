import type { Scheduler } from './Scheduler.js';

export interface SchedulerErrorPolicy {
  handle(error: unknown, scheduler: Scheduler): Promise<void> | void;
  shouldSkip(error: unknown): boolean;
}
