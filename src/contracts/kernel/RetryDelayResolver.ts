import type { ConsumerExecutionContext } from './ConsumerExecutionContext.js';

export type RetryDelayResolver = (
  attempt: number,
  error: unknown,
  context: ConsumerExecutionContext,
) => number | Promise<number>;
