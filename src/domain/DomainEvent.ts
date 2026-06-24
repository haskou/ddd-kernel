import { randomUUID } from 'node:crypto';

import type { Event } from './Event.js';
import type { EventAttributes } from './EventAttributes.js';

export abstract class DomainEvent implements Event {
  private causationId?: string;
  private correlationId?: string;

  constructor(
    public readonly aggregateId: string,
    public readonly attributes: EventAttributes = {},
    public readonly eventId: string = randomUUID(),
    public readonly occurredOn: Date = new Date(),
    correlationId?: string,
    causationId?: string,
  ) {
    this.correlationId = correlationId || eventId;
    this.causationId = causationId || eventId;
  }

  public encode(data: string): object {
    return JSON.parse(data) as object;
  }

  public decode(): string {
    const data = {
      aggregate_id: this.aggregateId,
      attributes: this.attributes,
      causation_id: this.causationId,
      correlation_id: this.correlationId,
      event_id: this.eventId,
      occurred_on: this.occurredOn.getTime(),
      type: this.eventName(),
    };

    return JSON.stringify(data);
  }

  public getCorrelationId(): string | undefined {
    return this.correlationId;
  }

  public getCausationId(): string | undefined {
    return this.causationId;
  }

  public withCorrelationId(correlationId: string): this {
    this.correlationId = correlationId;

    return this;
  }

  public withCausationId(causationId: string): this {
    this.causationId = causationId;

    return this;
  }

  public abstract eventName(): string;
}
