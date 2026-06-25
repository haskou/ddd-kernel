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
  middlewares: [requestIdMiddleware],
  preControllerMiddlewares: [authenticationMiddleware],
  postControllerMiddlewares: [notFoundMiddleware],
  swaggerHooks: [(app) => setupSwagger(app)],
  staticHooks: [(app) => app.use('/public', express.static('public'))],
});
```

Hook order is:

1. `middlewares`
2. `preControllerMiddlewares`
3. `beforeControllersHooks`
4. `routing-controllers`
5. `postControllerMiddlewares`
6. `afterControllersHooks`
7. `swaggerHooks`
8. `staticHooks`
9. `errorHandlers`
