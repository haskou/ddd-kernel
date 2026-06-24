import type { DomainEvent } from './DomainEvent.js';

export abstract class DomainEventPublisher {
  public abstract publish(domainEvents: DomainEvent[]): Promise<void>;
}
