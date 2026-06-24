import type { DomainEvent } from './DomainEvent.js';
import type { MessageHandler } from './MessageHandler.js';

export interface EventBus {
  subscribe<TEvent extends DomainEvent>(
    name: TEvent['name'],
    handler: MessageHandler<TEvent, void>,
  ): void;
  publish<TEvent extends DomainEvent>(event: TEvent): Promise<void>;
}
