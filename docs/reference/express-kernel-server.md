# ExpressKernelServer

Express runtime adapter using `routing-controllers`.

```ts
import { ExpressKernelServer } from '@haskou/ddd-kernel/adapters/ui/express';

const server = new ExpressKernelServer({ kernel, port: 3000 });

await server.run();
```

Routes are registered with `kernel.registerRoutes(RouteClass)`.
