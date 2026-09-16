import type { DomainEvent } from './DomainEvent.js';

export abstract class AggregateRoot {
  private domainEvents: DomainEvent[] = [];

  public abstract toPrimitives(): unknown;

  protected record(domainEvent: DomainEvent): void {
    this.domainEvents.push(domainEvent);
  }

  public pullDomainEvents(): DomainEvent[] {
    const domainEvents = this.domainEvents;
    this.domainEvents = [];

    return domainEvents;
  }
}
