import 'reflect-metadata';
import type { HttpApp } from '@haskou/ddd-kernel/adapters/ui/express';
import type { ErrorRequestHandler, RequestHandler } from 'express';

import { Kernel } from '@haskou/ddd-kernel';
import {
  CorrelationConsumerMiddleware,
  IdempotencyConsumerMiddleware,
  InMemoryIdempotencyStore,
  RetryConsumerMiddleware,
} from '@haskou/ddd-kernel/adapters/pubsub';
import { ExpressKernelServer } from '@haskou/ddd-kernel/adapters/ui/express';
import path from 'node:path';

import GetUserByIdRoute from './apps/api/routes/GetUserByIdRoute.js';

const rootDirectory = process.cwd();

// The kernel owns application lifecycle, dependency injection and shared
// infrastructure such as logging.
const kernel = new Kernel({
  servicesYamlPath: path.resolve(
    rootDirectory,
    'config',
    'container',
    'services.yaml',
  ),
  sourceDirectory: path.resolve(rootDirectory, 'src'),
});

// In development the container is rebuilt from default exports under src/.
// In production it can reuse the generated services.yaml file.
await kernel.dependencyInjection({
  containerBuild: process.env.NODE_ENV !== 'production',
});

// Consumer middleware is registered once and runs around every domain event
// consumer handled by the kernel.
kernel.registerConsumerMiddleware(
  new CorrelationConsumerMiddleware(),
  new IdempotencyConsumerMiddleware({
    store: new InMemoryIdempotencyStore(),
  }),
  new RetryConsumerMiddleware({
    maxAttempts: 3,
  }),
);

// Routes are plain routing-controllers classes resolved through constructor DI.
kernel.registerRoutes(GetUserByIdRoute);

const requestLoggerMiddleware: RequestHandler = (request, response, next) => {
  void response;
  kernel.logger.info(`${request.method} ${request.path}`);
  next();
};

const httpErrorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  next,
) => {
  void request;

  if (response.headersSent) {
    next(error);

    return;
  }

  kernel.logger.error(error instanceof Error ? error.message : String(error));
  response.status(500).json({
    error: 'InternalServerError',
    message: error instanceof Error ? error.message : 'Unexpected error',
  });
};

const server = new ExpressKernelServer({
  kernel,
  port: Number(process.env.PORT ?? 3000),
});

// The Express adapter stays optional. HTTP middleware, hooks and error handlers
// are registered only when the application actually needs an HTTP runtime.
server
  .registerMiddlewares(requestLoggerMiddleware)
  .registerHooks({
    handle: (app: HttpApp) => {
      app.get('/health', (request, response) => {
        void request;
        response.status(200).json({ status: 'ok' });
      });
    },
    phase: 'beforeErrors',
  })
  .registerErrorHandlers(httpErrorHandler);

// Shutdown hooks give the kernel one standard way to release runtime resources.
kernel.registerShutdownHook(() => server.close());

await server.run();
kernel.logger.info(`Application running on port ${process.env.PORT ?? 3000}`);

// Delegate OS signals to the kernel so consumers, schedulers, servers and logs
// are stopped consistently.
process.once('SIGINT', () => {
  void kernel.shutdown();
});
process.once('SIGTERM', () => {
  void kernel.shutdown();
});
