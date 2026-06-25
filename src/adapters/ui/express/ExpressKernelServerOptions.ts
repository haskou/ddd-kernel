import type { ErrorRequestHandler, RequestHandler } from 'express';

import type { Kernel } from '../../../Kernel.js';
import type { ExpressAppHook } from './ExpressAppHook.js';
import type { ExpressController } from './ExpressController.js';

export interface ExpressKernelServerOptions {
  readonly afterControllersHooks?: ExpressAppHook[];
  readonly beforeControllersHooks?: ExpressAppHook[];
  readonly controllers?: ExpressController[];
  readonly errorHandlers?: ErrorRequestHandler[];
  readonly kernel: Kernel;
  readonly middlewares?: RequestHandler[];
  readonly postControllerMiddlewares?: RequestHandler[];
  readonly preControllerMiddlewares?: RequestHandler[];
  readonly port?: number;
  readonly routePrefix?: string;
  readonly staticHooks?: ExpressAppHook[];
  readonly swaggerHooks?: ExpressAppHook[];
}
