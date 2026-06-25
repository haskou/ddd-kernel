# Concepts And Package Map

`@haskou/ddd-kernel` is split into three layers:

- **Core**: lifecycle, dependency injection, kernel logging contracts and the
  `Kernel` runtime.
- **Contracts and domain primitives**: stable interfaces and base classes that
  application code depends on.
- **Adapters**: optional infrastructure implementations for a contract or
  runtime boundary.

Application code should usually depend on contracts and domain primitives.
Bootstrap code chooses adapters.

## Core

| Area                   | Import                                    | Purpose                                                                  |
| ---------------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| Kernel runtime         | `@haskou/ddd-kernel`                      | Registers consumers, routes, schedulers, runtimes and shutdown hooks.    |
| Dependency injection   | `@haskou/ddd-kernel/dependency-injection` | Wraps `node-dependency-injection` and container YAML generation/loading. |
| Lifecycle              | `@haskou/ddd-kernel/lifecycle`            | Runtime and initializer contracts.                                       |
| Kernel logger contract | `@haskou/ddd-kernel/contracts/kernel`     | `KernelLogger` interface.                                                |

`node-dependency-injection` and `fs-extra` are package dependencies because the
core DI implementation uses them directly. Applications do not install them
separately.

## Contracts And Domain

| Area              | Import                                | Purpose                                                                                      |
| ----------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| Domain            | `@haskou/ddd-kernel/domain`           | `AggregateRoot`, `DomainEvent`, domain event bus contracts and consumer/publisher contracts. |
| Pub/sub contracts | `@haskou/ddd-kernel/contracts/pubsub` | Generic message bus, consumer registration and handler contracts.                            |
| DB contracts      | `@haskou/ddd-kernel/contracts/db`     | Repository-oriented persistence contracts.                                                   |
| UI contracts      | `@haskou/ddd-kernel/contracts/ui`     | Route contracts and HTTP status constants.                                                   |

## Adapters

| Group     | Adapter                                | Import                                         | Extra packages                                                                                                                                             |
| --------- | -------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pub/sub   | In-memory                              | `@haskou/ddd-kernel/adapters/pubsub/in-memory` | None                                                                                                                                                       |
| Pub/sub   | AMQP                                   | `@haskou/ddd-kernel/adapters/pubsub/amqp`      | `amqplib`                                                                                                                                                  |
| DB        | In-memory repository                   | `@haskou/ddd-kernel/adapters/db/in-memory`     | None                                                                                                                                                       |
| DB        | Mongo repository                       | `@haskou/ddd-kernel/adapters/db/mongo`         | `mongodb`                                                                                                                                                  |
| UI        | Express server and HTTP error handling | `@haskou/ddd-kernel/adapters/ui/express`       | `express`, `routing-controllers`, `reflect-metadata`, `class-transformer`, `class-validator`; `cors` only when `routingControllersOptions.cors` is enabled |
| UI        | Route base class                       | `@haskou/ddd-kernel/adapters/ui/routes`        | Same runtime as the HTTP server that executes routes                                                                                                       |
| Kernel    | Console logger                         | `@haskou/ddd-kernel/adapters/kernel/console`   | None                                                                                                                                                       |
| Logs      | Winston logger                         | `@haskou/ddd-kernel/logs`                      | `winston`                                                                                                                                                  |
| Scheduler | Cron scheduler base                    | `@haskou/ddd-kernel/scheduler`                 | `node-cron`                                                                                                                                                |
| WebSocket | Event hub and realtime server          | `@haskou/ddd-kernel/websocket`                 | `ws`                                                                                                                                                       |

Adapters are optional. Importing the kernel or domain contracts does not require
Express, AMQP, MongoDB, Winston or WebSocket packages.

## Application Boundary

Use constructor injection inside consumers, schedulers, routes and services.
Use bootstrap code to choose infrastructure:

```ts
await kernel.dependencyInjection({
  overrides: [
    {
      token: UserRepository,
      useClass:
        process.env.NODE_ENV === 'test'
          ? InMemoryUserRepository
          : MongoUserRepository,
    },
  ],
});
```

That keeps domain/application code stable while adapters change per runtime.
