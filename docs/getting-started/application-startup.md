# Application Startup

The usual startup flow is:

```ts
import 'reflect-metadata';

import Kernel from '@haskou/ddd-kernel';
import { ExpressKernelServer } from '@haskou/ddd-kernel/adapters/ui/express';
import { applicationConsumers } from './apps/ApplicationConsumers.js';
import { recurringSchedulers } from './apps/ApplicationSchedulers.js';
import GetUserByIdRoute from './apps/api/routes/GetUserByIdRoute.js';

const kernel = new Kernel({
  sourceDirectory: 'src',
  servicesYamlPath: 'config/container/services.yaml',
});

await kernel.dependencyInjection({
  containerBuild: process.env.CONTAINER_BUILD === 'true',
});
kernel.registerRoutes(GetUserByIdRoute);
kernel.registerConsumers(...applicationConsumers);
kernel.registerSchedulers(...recurringSchedulers);

const server = new ExpressKernelServer({ kernel, port: 3000 });
kernel.registerShutdownHook(() => server.close());

await server.run();
await kernel.runConsumers();
await kernel.runSchedulers();

kernel.logger.info('Application running on port 3000');
```

`CONTAINER_BUILD=true` regenerates `config/container/services.yaml`. Without it,
the generated YAML is loaded.

`new Kernel(...)` configures defaults for the runtime. `kernel.dependencyInjection(...)`
can override the DI-specific values for a particular boot.

Call `kernel.shutdown()` from your process signal handlers to stop consumers,
stop schedulers, close servers, flush logs and release connections registered
through shutdown hooks:

```ts
process.once('SIGTERM', () => {
  void kernel.shutdown();
});
```
