import type { DomainEvent } from './DomainEvent.js';

export abstract class DomainEventConsumer {
  public abstract consume(
    queueName: string,
    bindingKey: string,
    domainEvent: typeof DomainEvent,
    exchange: string,
    handler: (event: DomainEvent) => Promise<void>,
  ): Promise<void>;
}
