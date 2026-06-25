# ExpressKernelServer

Express runtime adapter using `routing-controllers`.

```ts
import { ExpressKernelServer } from '@haskou/ddd-kernel/adapters/ui/express';

const server = new ExpressKernelServer({ kernel, port: 3000 });

await server.run();
```

Routes are registered with `kernel.registerRoutes(RouteClass)`.

## External Controllers

Applications can add controllers at the server boundary without registering them
on the kernel:

```ts
const server = new ExpressKernelServer({
  controllers: [HealthController],
  kernel,
  port: 3000,
});
```

`controllers` are merged with `kernel.getRoutes()` before
`routing-controllers` is configured.

## HTTP Middleware And Hooks

Use middleware arrays for normal Express middleware and hooks for integrations
that need direct app access, such as Swagger or static assets:

```ts
const server = new ExpressKernelServer({
  kernel,
  hooks: [
    { phase: 'beforeControllers', handle: setupTracing },
    { phase: 'beforeErrors', handle: setupSwagger },
    { phase: 'beforeErrors', handle: setupStaticAssets },
  ],
  middlewares: [requestIdMiddleware],
  preControllerMiddlewares: [authenticationMiddleware],
  postControllerMiddlewares: [notFoundMiddleware],
});
```

Hook order is:

1. `middlewares`
2. `preControllerMiddlewares`
3. `beforeControllersHooks`
4. `hooks` with `phase: 'beforeControllers'`
5. `routing-controllers`
6. `postControllerMiddlewares`
7. `afterControllersHooks`
8. `hooks` with `phase: 'afterControllers'`
9. `swaggerHooks`
10. `staticHooks`
11. `hooks` with `phase: 'beforeErrors'`
12. `errorHandlers`

`swaggerHooks` and `staticHooks` remain available for compatibility. New
integrations should use `hooks` with an explicit phase.
