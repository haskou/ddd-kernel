# ExpressKernelServer

Express runtime adapter using `routing-controllers`.

```ts
import { ExpressKernelServer } from '@haskou/ddd-kernel/adapters/ui/express';

const server = new ExpressKernelServer({ kernel, port: 3000 });

await server.run();
```

Routes are registered with `kernel.registerRoutes(RouteClass)`.

The adapter can be configured either through constructor options or by calling
registration methods before `run()`. The methods return the server instance, so
they can be chained.

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

The same can be done after construction:

```ts
server.registerControllers(HealthController, MetricsController);
```

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

You can also register the pipeline imperatively before the server starts:

```ts
const server = new ExpressKernelServer({ kernel, port: 3000 });

server
  .registerMiddlewares(requestIdMiddleware)
  .registerPreControllerMiddlewares(authenticationMiddleware)
  .registerHooks({
    phase: 'beforeErrors',
    handle: (app) => {
      app.get('/health', (request, response) => {
        void request;
        response.status(200).json({ status: 'ok' });
      });
    },
  })
  .registerPostControllerMiddlewares(notFoundMiddleware);

await server.run();
```

Registration methods must be called before `run()`. Once the server is running,
the Express pipeline is fixed and further registration throws an error.

## Error Handlers

Use `errorHandlers` or `registerErrorHandlers()` for normal Express error
middleware:

```ts
import type { ErrorRequestHandler } from 'express';

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

  response.status(error.statusCode ?? 500).json({
    error: error.name ?? 'InternalServerError',
    message: error.message ?? 'Unexpected error',
  });
};

const server = new ExpressKernelServer({ kernel });

server.registerErrorHandlers(httpErrorHandler);
```

Error handlers run after:

1. global middleware
2. pre-controller middleware
3. controllers
4. post-controller middleware
5. hooks registered for `beforeErrors`

If no error handler is registered, `ExpressKernelServer` uses a default handler
that returns a `500` JSON response.

## Registration API

`ExpressKernelServer` exposes these registration methods:

```ts
server.registerControllers(...controllers);
server.registerMiddlewares(...middlewares);
server.registerPreControllerMiddlewares(...middlewares);
server.registerPostControllerMiddlewares(...middlewares);
server.registerHooks(...hooks);
server.registerBeforeControllersHooks(...hooks);
server.registerAfterControllersHooks(...hooks);
server.registerErrorHandlers(...handlers);
```
