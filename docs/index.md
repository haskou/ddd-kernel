# DDD Kernel

`@haskou/ddd-kernel` provides the shared DDD infrastructure used to bootstrap
TypeScript applications and microservices without copying the same kernel,
dependency injection, pub/sub, route and scheduler code into every project.

The package follows the startup style used by `pigeon-swarm-node`:

```ts
import Kernel from '@haskou/ddd-kernel';
import { applicationConsumers } from './apps/ApplicationConsumers.js';

const kernel = new Kernel();

await kernel.dependencyInjection();
kernel.registerConsumers(...applicationConsumers);
await kernel.runConsumers();
```

Start with [the introduction](/getting-started/introduction).
