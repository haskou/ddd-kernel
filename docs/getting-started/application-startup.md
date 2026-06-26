# Application Startup

The usual startup flow is:

```ts
import 'reflect-metadata';

import Kernel from '@haskou/ddd-kernel';
import { ExpressKernelServer } from '@haskou/ddd-kernel/adapters/ui/express';
import { applicationConsumers } from './apps/ApplicationConsumers.js';
import { recurringSchedulers } from './apps/ApplicationSchedulers.js';
import GetUserByIdRoute from './apps/api/routes/GetUserByIdRoute.js';

const environmentSchema = {
  NODE_ENV: { defaultValue: 'local', type: 'string' },
  PORT: { defaultValue: 3000, type: 'number' },
} as const;

const kernel = new Kernel({
  environmentSchema,
  sourceDirectory: 'src',
  servicesYamlPath: 'config/container/services.yaml',
});

kernel.loadEnvironmentVariables();

await kernel.dependencyInjection({
  containerBuild: kernel.environment.NODE_ENV !== 'production',
});
kernel.registerRoutes(GetUserByIdRoute);
kernel.registerConsumers(...applicationConsumers);
kernel.registerSchedulers(...recurringSchedulers);

const server = new ExpressKernelServer({
  kernel,
  port: kernel.environment.PORT,
});
kernel.registerShutdownHook(() => server.close());

await server.run();
await kernel.runConsumers();
await kernel.runSchedulers();

kernel.logger.info(`Application running on port ${kernel.environment.PORT}`);
```

`loadEnvironmentVariables()` loads `.env.local` by default when `NODE_ENV` is
not set. Passing `test` loads `.env.test`; passing an empty string loads `.env`.
When a schema is configured, required variables are validated and values are
parsed before they are exposed through `kernel.environment`.

`containerBuild: true` regenerates `config/container/services.yaml`. Production
runtimes should usually load the generated YAML instead of rebuilding from
`src`.

`new Kernel(...)` configures defaults for the runtime.
`kernel.dependencyInjection(...)` can override the DI-specific values for a
particular boot.

Call `kernel.shutdown()` from your process signal handlers to stop consumers,
stop schedulers, close servers, flush logs and release connections registered
through shutdown hooks:

```ts
process.once('SIGTERM', () => {
  void kernel.shutdown();
});
```
