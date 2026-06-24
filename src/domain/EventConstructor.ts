import type { DomainEvent } from './DomainEvent.js';

export type EventConstructor<TEvent extends DomainEvent = DomainEvent> = {
  new (...args: never[]): TEvent;
};
