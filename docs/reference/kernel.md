# Kernel

Main application runtime.

```ts
import Kernel from '@haskou/ddd-kernel';

const kernel = new Kernel();

await kernel.dependencyInjection();
kernel.registerConsumers(...applicationConsumers);
await kernel.runConsumers();
```

## Responsibilities

- Configure and expose `Kernel.di`.
- Register route, consumer and scheduler classes.
- Run consumers, schedulers, initializers and runtimes.
- Expose `kernel.logger` through the `KernelLogger` contract.
- Run `kernel.shutdown()` hooks for consumers, schedulers, runtimes, servers,
  loggers and custom resources.

The kernel core does not own concrete HTTP, AMQP, Mongo or logging
implementations. Use optional adapters for those concerns.

## Constructor Options

```ts
const kernel = new Kernel({
  logger,
  servicesYamlPath: 'config/container/services.yaml',
  sourceDirectory: 'src',
});
```

| Option             | Default                                   | Purpose                                                                                                 |
| ------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `di`               | Created by `kernel.dependencyInjection()` | Provide an already configured `DependencyInjection` instance. Useful in tests or custom bootstrap code. |
| `logger`           | `new ConsoleKernelLogger()`               | Logger exposed as `kernel.logger` and `Kernel.logger`. Any `KernelLogger` implementation can be used.   |
| `servicesYamlPath` | `config/container/services.yaml`          | Default container file used by `kernel.dependencyInjection()`.                                          |
| `sourceDirectory`  | `src`                                     | Default source tree scanned when the container is generated.                                            |

`servicesYamlPath` and `sourceDirectory` can also be passed directly to
`kernel.dependencyInjection(...)`; the method-level value wins.

## Dependency Injection

Most applications call this once during startup:

```ts
await kernel.dependencyInjection({
  containerBuild: process.env.NODE_ENV === 'production',
  overrides: [],
});
```

| Option             | Default                                                | Purpose                                                                                          |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `containerBuild`   | `process.env.CONTAINER_BUILD === 'true'`               | Regenerate `services.yaml` from source classes when `true`; load the existing YAML when `false`. |
| `overrides`        | `[]`                                                   | Replace a token with `useClass`, `useValue` or `useFactory`.                                     |
| `servicesYamlPath` | Constructor option or `config/container/services.yaml` | Container YAML path for this compile.                                                            |
| `sourceDirectory`  | Constructor option or `src`                            | Source tree used when generating the container.                                                  |

Prefer constructor injection in application classes. Use overrides at bootstrap
or test setup to choose infrastructure.

## Registration API

```ts
kernel.registerRoutes(GetUserByIdRoute);
kernel.registerConsumers(RegisterUserWhenCreated);
kernel.registerSchedulers(UserCleanupScheduler);
kernel.registerConsumerMiddleware(retryMiddleware, tracingMiddleware);
kernel.registerShutdownHook(() => server.close());
```

Class registration resolves through `Kernel.di`. Instance registration is
available when a runtime object is already built:

```ts
kernel.registerConsumerInstances(consumer);
kernel.registerSchedulerInstances(scheduler);
kernel.registerRuntime(server);
```

## Running And Shutdown

```ts
await kernel.runInitializers();
await kernel.runConsumers();
await kernel.runSchedulers();
await kernel.runRuntimes();

process.once('SIGTERM', () => {
  void kernel.shutdown();
});
```

`shutdown()` stops registered consumers, schedulers, runtimes and explicit
shutdown hooks. It also supports common resource methods such as `close`,
`stop`, `flush` and `shutdown`.

## Import

```ts
import Kernel, { Kernel as NamedKernel } from '@haskou/ddd-kernel';
```
