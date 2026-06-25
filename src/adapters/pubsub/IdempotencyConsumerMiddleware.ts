import type {
  ConsumerExecutionContext,
  ConsumerMiddleware,
  ConsumerNext,
} from '../../contracts/index.js';
import type { DomainEvent } from '../../domain/index.js';
import type { IdempotencyConsumerMiddlewareOptions } from './IdempotencyConsumerMiddlewareOptions.js';

export class IdempotencyConsumerMiddleware implements ConsumerMiddleware {
  constructor(private readonly options: IdempotencyConsumerMiddlewareOptions) {}

  private async handleClaimedKey(
    key: string,
    next: ConsumerNext,
  ): Promise<void> {
    const claimed = await this.options.store.claim?.(key);

    if (!claimed) {
      return;
    }

    try {
      await next();
      await (this.options.store.commit?.(key) ?? this.options.store.mark(key));
    } catch (error: unknown) {
      await this.options.store.release?.(key);

      throw error;
    }
  }

  private async handleLegacyKey(
    key: string,
    next: ConsumerNext,
  ): Promise<void> {
    if (await this.options.store.has(key)) {
      return;
    }

    await next();
    await this.options.store.mark(key);
  }

  public async handle(
    event: DomainEvent,
    next: ConsumerNext,
    context: ConsumerExecutionContext,
  ): Promise<void> {
    const key = this.options.key?.(event, context) ?? context.eventId;

    if (this.options.store.claim) {
      await this.handleClaimedKey(key, next);
    } else {
      await this.handleLegacyKey(key, next);
    }
  }
}

export default IdempotencyConsumerMiddleware;
