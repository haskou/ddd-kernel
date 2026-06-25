import type { DomainEvent } from '../../domain/index.js';
import type { ConsumerExecutionContext } from './ConsumerExecutionContext.js';
import type { ConsumerNext } from './ConsumerNext.js';

export interface ConsumerMiddleware {
  handle(
    event: DomainEvent,
    next: ConsumerNext,
    context: ConsumerExecutionContext,
  ): Promise<void>;
}
