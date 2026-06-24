import cron from 'node-cron';

import type { CronExpression } from './CronExpression.js';

import { Kernel } from '../../Kernel.js';
import { InvalidParseCronExpressionError } from './InvalidParseCronExpressionError.js';
import { ScheduledExecutionError } from './ScheduledExecutionError.js';

export abstract class Scheduler {
  private parseCronExpression(): string {
    const expression = this.getCronExpression();

    return (
      '' +
      `${expression.second ?? '*'} ` +
      `${expression.minute ?? '*'} ` +
      `${expression.hour ?? '*'} ` +
      `${expression.dayOfMonth ?? '*'} ` +
      `${expression.month ?? '*'} ` +
      `${expression.dayOfWeek ?? '*'}`
    );
  }

  public abstract execute(): Promise<void>;

  public abstract getCronExpression(): CronExpression;

  public abstract getProcessName(): string;

  public async runOnce(): Promise<void> {
    try {
      Kernel.logger?.debug?.(`Scheduler: Executing ${this.getProcessName()}`);
      await this.execute();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const error = new ScheduledExecutionError(
        `Error on ${this.getProcessName()}: ${errorMessage}`,
      );

      Kernel.logger?.error?.(error.message);
    }
  }

  public get<T>(service: unknown): T {
    return Kernel.di.getService<T>(service);
  }

  public init(): Promise<void> {
    let parsedCronExpression: string;

    try {
      parsedCronExpression = this.parseCronExpression();
    } catch {
      throw new InvalidParseCronExpressionError(this.getProcessName());
    }

    cron.schedule(parsedCronExpression, () => {
      void this.runOnce();
    });

    return Promise.resolve();
  }
}

export default Scheduler;
