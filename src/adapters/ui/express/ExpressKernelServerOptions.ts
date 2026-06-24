import type { ErrorRequestHandler, RequestHandler } from 'express';

import type { Kernel } from '../../../Kernel.js';

export interface ExpressKernelServerOptions {
  readonly errorHandlers?: ErrorRequestHandler[];
  readonly kernel: Kernel;
  readonly middlewares?: RequestHandler[];
  readonly port?: number;
  readonly routePrefix?: string;
}
