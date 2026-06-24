import type { RouteHandler } from './RouteHandler.js';

export interface Route<TRequest = unknown, TResponse = unknown> {
  readonly method: string;
  readonly path: string;
  readonly handler: RouteHandler<TRequest, TResponse>;
}
