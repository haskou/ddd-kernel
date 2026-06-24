import type { HandlerContext } from '../kernel/HandlerContext.js';
import type { Message } from './Message.js';

export type MessageHandler<
  TMessage extends Message = Message,
  TResult = unknown,
> = (message: TMessage, context: HandlerContext) => TResult | Promise<TResult>;
