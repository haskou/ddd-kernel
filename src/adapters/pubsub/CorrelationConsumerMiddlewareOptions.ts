import type { ConsumerExecutionContext } from '../../contracts/index.js';
import type { DomainEvent } from '../../domain/index.js';

export interface CorrelationConsumerMiddlewareOptions {
  readonly causationId?: (
    event: DomainEvent,
    context: ConsumerExecutionContext,
  ) => string | undefined;
  readonly correlationId?: (
    event: DomainEvent,
    context: ConsumerExecutionContext,
  ) => string | undefined;
}
