import type {
  ConsumerExecutionContext,
  ConsumerMiddleware,
  ConsumerNext,
} from '../../contracts/index.js';
import type { DomainEvent } from '../../domain/index.js';
import type { RetryConsumerMiddlewareOptions } from './RetryConsumerMiddlewareOptions.js';

export class RetryConsumerMiddleware implements ConsumerMiddleware {
  constructor(private readonly options: RetryConsumerMiddlewareOptions) {}

  private async delay(
    attempt: number,
    error: unknown,
    context: ConsumerExecutionContext,
  ): Promise<void> {
    const delayInMilliseconds =
      typeof this.options.delay === 'function'
        ? await this.options.delay(attempt, error, context)
        : (this.options.delay ?? 0);

    if (delayInMilliseconds > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayInMilliseconds));
    }
  }

  public async handle(
    event: DomainEvent,
    next: ConsumerNext,
    context: ConsumerExecutionContext,
  ): Promise<void> {
    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        await next();

        return;
      } catch (error: unknown) {
        const canRetry =
          attempt < this.options.maxAttempts &&
          (await (this.options.shouldRetry?.(error, attempt, context) ?? true));

        if (!canRetry) {
          throw error;
        }

        await this.options.onRetry?.(error, attempt, context);
        await this.delay(attempt, error, context);
      }
    }
  }
}

export default RetryConsumerMiddleware;
