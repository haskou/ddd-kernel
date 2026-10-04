import type {
  ConsumerExecutionContext,
  ConsumerMiddleware,
  ConsumerNext,
} from '../../contracts/index.js';
import type { DomainEvent } from '../../domain/index.js';
import type { IdempotencyConsumerMiddlewareOptions } from './IdempotencyConsumerMiddlewareOptions.js';

export class IdempotencyConsumerMiddleware implements ConsumerMiddleware {
  constructor(private readonly options: IdempotencyConsumerMiddlewareOptions) {}

  public async handle(
    event: DomainEvent,
    next: ConsumerNext,
    context: ConsumerExecutionContext,
  ): Promise<void> {
    const key = this.options.key?.(event, context) ?? context.eventId;
    const claimed = await this.options.store.claim(key);

    if (!claimed) {
      return;
    }

    try {
      await next();
      await this.options.store.commit(key);
    } catch (error: unknown) {
      await this.options.store.release(key);

      throw error;
    }
  }
}

export default IdempotencyConsumerMiddleware;
