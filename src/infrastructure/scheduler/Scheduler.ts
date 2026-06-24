import cron from 'node-cron';

import type { CronExpression } from './CronExpression.js';
import type { SchedulerErrorPolicy } from './SchedulerErrorPolicy.js';

import { Kernel } from '../../Kernel.js';
import { DefaultSchedulerErrorPolicy } from './DefaultSchedulerErrorPolicy.js';
import { InvalidParseCronExpressionError } from './InvalidParseCronExpressionError.js';

export abstract class Scheduler {
  constructor(
    private readonly errorPolicy: SchedulerErrorPolicy = new DefaultSchedulerErrorPolicy(),
  ) {}

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
    } catch (error: unknown) {
      if (this.errorPolicy.shouldSkip(error)) {
        return;
      }

      await this.errorPolicy.handle(error, this);
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
