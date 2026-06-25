# DependencyInjection

Wrapper around `node-dependency-injection`.

```ts
import { DependencyInjection } from '@haskou/ddd-kernel/dependency-injection';

const di = DependencyInjection.configure({
  containerBuild: process.env.CONTAINER_BUILD === 'true',
  servicesYamlPath: 'config/container/services.yaml',
  sourceDirectory: 'src',
});

await di.compile();
```

Most applications call `kernel.dependencyInjection()` instead.

## Overrides

Use dependency overrides when the application wants a different implementation
for a contract in a specific runtime, such as replacing a Mongo repository with
an in-memory repository in tests.

Overrides are applied after `services.yaml` is loaded or generated and before
the container is compiled. That makes them win over the aliases generated from
abstract parents.

```ts
await kernel.dependencyInjection({
  overrides: [
    {
      token: UserRepository,
      useClass: InMemoryUserRepository,
    },
  ],
});
```

`token` is the contract or class consumers ask the container for. `useClass` is
the implementation that should be returned instead.

Tests can also provide an already built instance:

```ts
const users = new InMemoryUserRepository();

await kernel.dependencyInjection({
  overrides: [
    {
      token: UserRepository,
      useValue: users,
    },
  ],
});
```

Factories are useful when the replacement has local setup:

```ts
await kernel.dependencyInjection({
  overrides: [
    {
      token: UserRepository,
      useFactory: () => new InMemoryUserRepository(seedUsers),
    },
  ],
});
```

Prefer constructor injection in services, consumers, schedulers and routes. The
override belongs at application bootstrap or test setup, not inside the class
that needs the dependency.
