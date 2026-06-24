import type { Message } from './Message.js';
import type { MessageHandler } from './MessageHandler.js';

export interface Consumer<TMessage extends Message = Message> {
  readonly topic: string;
  readonly handler: MessageHandler<TMessage, void>;
}
