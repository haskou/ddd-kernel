import type { Message } from './Message.js';
import type { MessageHandler } from './MessageHandler.js';
import type { PublisherHook } from './PublisherHook.js';
import type { Subscription } from './Subscription.js';

export interface MessageBus {
  publish<TMessage extends Message>(
    topic: string,
    message: TMessage,
  ): Promise<void>;
  registerPublisherHooks(...hooks: PublisherHook[]): void;
  subscribe<TMessage extends Message>(
    topic: string,
    consumer: MessageHandler<TMessage, void>,
  ): Promise<Subscription>;
}
