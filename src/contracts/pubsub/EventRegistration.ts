import type { DomainEvent } from './DomainEvent.js';
import type { MessageHandler } from './MessageHandler.js';

export interface EventRegistration<TEvent extends DomainEvent = DomainEvent> {
  readonly name: TEvent['name'];
  readonly handler: MessageHandler<TEvent, void>;
}
