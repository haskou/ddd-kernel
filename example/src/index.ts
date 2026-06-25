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
const kernel = new Kernel({
  servicesYamlPath: path.resolve(
    rootDirectory,
    'config',
    'container',
    'services.yaml',
  ),
  sourceDirectory: path.resolve(rootDirectory, 'src'),
});

await kernel.dependencyInjection({
  containerBuild: process.env.NODE_ENV !== 'production',
});

kernel.registerConsumerMiddleware(
  new CorrelationConsumerMiddleware(),
  new IdempotencyConsumerMiddleware({
    store: new InMemoryIdempotencyStore(),
  }),
  new RetryConsumerMiddleware({
    maxAttempts: 3,
  }),
);
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

kernel.registerShutdownHook(() => server.close());

await server.run();
kernel.logger.info(`Application running on port ${process.env.PORT ?? 3000}`);

process.once('SIGINT', () => {
  void kernel.shutdown();
});
process.once('SIGTERM', () => {
  void kernel.shutdown();
});
