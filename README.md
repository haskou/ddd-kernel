# @haskou/ddd-kernel

[![CI](https://github.com/haskou/ddd-kernel/actions/workflows/ci.yml/badge.svg)](https://github.com/haskou/ddd-kernel/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/haskou/ddd-kernel/branch/main/graph/badge.svg)](https://codecov.io/gh/haskou/ddd-kernel)
[![npm](https://img.shields.io/npm/v/@haskou/ddd-kernel.svg)](https://www.npmjs.com/package/@haskou/ddd-kernel)
[![license](https://img.shields.io/npm/l/@haskou/ddd-kernel.svg)](LICENSE)

Framework-agnostic DDD kernel for TypeScript applications and microservices.

The expected startup pattern mirrors `pigeon-swarm-node`: application classes
are exported as `default`, `node-dependency-injection` generates or loads
`services.yaml`, and the kernel resolves consumers, schedulers, initializers and
runtimes through the configured container. Constructor injection is the normal
path for application services; `Kernel.di` and `this.get()` exist for framework
boundaries and backwards compatibility.

```ts
import { applicationConsumers } from './apps/ApplicationConsumers.js';
import { applicationInitializers } from './apps/ApplicationInitializers.js';
import { applicationRuntimes } from './apps/ApplicationRuntimes.js';
import { recurringSchedulers } from './apps/ApplicationSchedulers.js';
import { Kernel } from '@haskou/ddd-kernel';

const kernel = new Kernel();

await kernel.dependencyInjection();

kernel.registerConsumers(...applicationConsumers);
await kernel.runInitializers(...applicationInitializers);
await kernel.runConsumers();

kernel.registerSchedulers(...recurringSchedulers);
await kernel.runSchedulers();

await kernel.runRuntimes(...applicationRuntimes);
```

Normal application code should not register factories manually. Application
services, repositories, adapters, schedulers, runtimes and consumers should be
default-exported classes so the autowire flow can resolve them.

## Imports

```ts
import { Kernel } from '@haskou/ddd-kernel';
import { DependencyInjection } from '@haskou/ddd-kernel/dependency-injection';
import { AggregateRoot, DomainEvent } from '@haskou/ddd-kernel/domain';
import { Scheduler } from '@haskou/ddd-kernel/scheduler';
```

Optional adapters:

```ts
import { InMemoryRepository } from '@haskou/ddd-kernel/adapters/db/in-memory';
import { MongoRepository } from '@haskou/ddd-kernel/adapters/db/mongo';
import { InMemoryPubSub } from '@haskou/ddd-kernel/adapters/pubsub/in-memory';
import { ExpressKernelServer } from '@haskou/ddd-kernel/adapters/ui/express';
```

Contracts:

```ts
import type { Repository, UnitOfWork } from '@haskou/ddd-kernel/contracts/db';
import type { Consumer, PubSub } from '@haskou/ddd-kernel/contracts/pubsub';
```

UI helpers:

```ts
import Route from '@haskou/ddd-kernel/adapters/ui/routes';
import { HttpRouteStatusEnum } from '@haskou/ddd-kernel/contracts/ui';
```

## Dependency Injection

Default setup:

```ts
const kernel = new Kernel();
await kernel.dependencyInjection();
```

This uses:

- `src` as the source directory.
- `config/container/services.yaml` as the generated or loaded container file.
- `CONTAINER_BUILD=true` to regenerate the YAML through autowire.

Override paths when needed:

```ts
const kernel = new Kernel({
  servicesYamlPath: 'config/container/services.yaml',
  sourceDirectory: 'src',
});
```

Prefer constructor injection for consumers, schedulers, routes, repositories and
application services:

```ts
export default class RegisterUserWhenCreated {
  constructor(private readonly finder: UserByIdFinder) {}
}
```

Use `Kernel.di.getService(...)` only at the composition boundary or in legacy
code that still extends a base class exposing `this.get()`.

## Example

See `example/` for a small route/application/domain setup that imports the
package through `file:..`.

```bash
cd example
yarn install
yarn typecheck
yarn build
```

## Documentation

Full documentation is available at **https://haskou.github.io/ddd-kernel/**

The documentation includes installation, quick start, examples, error handling, serialization notes, and one reference page per exported class.

## Scripts

```bash
yarn lint
yarn typecheck
yarn build
```

## License

MIT. See [LICENSE](LICENSE).
