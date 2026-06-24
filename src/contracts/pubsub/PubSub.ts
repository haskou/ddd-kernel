import type { Message } from './Message.js';
import type { MessageHandler } from './MessageHandler.js';
import type { Subscription } from './Subscription.js';

export interface PubSub {
  publish<TMessage extends Message>(
    topic: string,
    message: TMessage,
  ): Promise<void>;
  subscribe<TMessage extends Message>(
    topic: string,
    consumer: MessageHandler<TMessage, void>,
  ): Promise<Subscription>;
}
