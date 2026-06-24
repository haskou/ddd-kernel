import type { Message } from '../pubsub/Message.js';
import type { HandlerContext } from './HandlerContext.js';

export type KernelMiddleware = (
  message: Message,
  next: () => Promise<unknown>,
  context: HandlerContext,
) => Promise<unknown>;
