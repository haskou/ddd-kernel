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

## Import

```ts
import Kernel, { Kernel as NamedKernel } from '@haskou/ddd-kernel';
```
