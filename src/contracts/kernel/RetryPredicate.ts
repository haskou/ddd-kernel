import type { ConsumerExecutionContext } from './ConsumerExecutionContext.js';

export type RetryPredicate = (
  error: unknown,
  attempt: number,
  context: ConsumerExecutionContext,
) => boolean | Promise<boolean>;
