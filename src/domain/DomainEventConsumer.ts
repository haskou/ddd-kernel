import type { DomainEvent } from './DomainEvent.js';
import type { DomainEventConsumerContext } from './DomainEventConsumerContext.js';

export abstract class DomainEventConsumer {
  public abstract consume(
    queueName: string,
    bindingKey: string,
    domainEvent: typeof DomainEvent,
    exchange: string,
    handler: (
      event: DomainEvent,
      context?: DomainEventConsumerContext,
    ) => Promise<void>,
  ): Promise<void>;
}
