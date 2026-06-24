import type { HandlerContext } from '../kernel/HandlerContext.js';

export type RouteHandler<TRequest = unknown, TResponse = unknown> = (
  request: TRequest,
  context: HandlerContext,
) => TResponse | Promise<TResponse>;
