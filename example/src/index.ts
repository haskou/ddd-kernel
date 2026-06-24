import 'reflect-metadata';

import { Kernel } from '@haskou/ddd-kernel';
import { ExpressKernelServer } from '@haskou/ddd-kernel/adapters/ui/express';

import GetUserByIdRoute from './apps/api/routes/GetUserByIdRoute.js';

const kernel = new Kernel({
  servicesYamlPath: 'config/container/services.yaml',
  sourceDirectory: 'src',
});

await kernel.dependencyInjection();

const server = new ExpressKernelServer({
  kernel,
  port: Number(process.env.PORT ?? 3000),
});

kernel.registerRoutes(GetUserByIdRoute);
kernel.registerShutdownHook(() => server.close());

await server.run();
kernel.logger.info(`Application running on port ${process.env.PORT ?? 3000}`);
