import type {
  ConsumerExecutionContext,
  RetryDelayResolver,
  RetryPredicate,
} from '../../contracts/index.js';

export interface RetryConsumerMiddlewareOptions {
  readonly delay?: number | RetryDelayResolver;
  readonly maxAttempts: number;
  readonly onRetry?: (
    error: unknown,
    attempt: number,
    context: ConsumerExecutionContext,
  ) => Promise<void> | void;
  readonly shouldRetry?: RetryPredicate;
}
