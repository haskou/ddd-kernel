import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { RoutingControllersOptions } from 'routing-controllers';

import type { Kernel } from '../../../Kernel.js';
import type { KernelEnvironmentSchema } from '../../../kernel/KernelEnvironmentSchema.js';
import type { ExpressAppHook } from './ExpressAppHook.js';
import type { ExpressController } from './ExpressController.js';
import type { ExpressPhaseHook } from './ExpressPhaseHook.js';

export interface ExpressKernelServerOptions {
  readonly afterControllersHooks?: ExpressAppHook[];
  readonly beforeControllersHooks?: ExpressAppHook[];
  readonly controllers?: ExpressController[];
  readonly errorHandlers?: ErrorRequestHandler[];
  readonly hooks?: ExpressPhaseHook[];
  readonly kernel: Kernel<KernelEnvironmentSchema | undefined>;
  readonly middlewares?: RequestHandler[];
  readonly postControllerMiddlewares?: RequestHandler[];
  readonly preControllerMiddlewares?: RequestHandler[];
  readonly port?: number;
  readonly routePrefix?: string;
  readonly routingControllersOptions?: Omit<
    RoutingControllersOptions,
    'controllers' | 'routePrefix'
  >;
  /**
   * @deprecated Prefer `hooks` with `phase: 'beforeErrors'`.
   */
  readonly staticHooks?: ExpressAppHook[];
  /**
   * @deprecated Prefer `hooks` with `phase: 'beforeErrors'`.
   */
  readonly swaggerHooks?: ExpressAppHook[];
}
