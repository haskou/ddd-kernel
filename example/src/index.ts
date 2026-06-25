import 'reflect-metadata';
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

const server = new ExpressKernelServer({
  hooks: [
    {
      handle: (app) => {
        app.get('/health', (request, response) => {
          void request;
          response.status(200).json({ status: 'ok' });
        });
      },
      phase: 'beforeErrors',
    },
  ],
  kernel,
  port: Number(process.env.PORT ?? 3000),
});

kernel.registerShutdownHook(() => server.close());

await server.run();
kernel.logger.info(`Application running on port ${process.env.PORT ?? 3000}`);

process.once('SIGINT', () => {
  void kernel.shutdown();
});
process.once('SIGTERM', () => {
  void kernel.shutdown();
});
