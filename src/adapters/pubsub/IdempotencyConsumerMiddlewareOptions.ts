import type {
  ConsumerExecutionContext,
  IdempotencyStore,
} from '../../contracts/index.js';
import type { DomainEvent } from '../../domain/index.js';

export interface IdempotencyConsumerMiddlewareOptions {
  readonly key?: (
    event: DomainEvent,
    context: ConsumerExecutionContext,
  ) => string;
  readonly store: IdempotencyStore;
}
