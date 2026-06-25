# DependencyInjection

Dependency injection wrapper used by `Kernel`.

Most applications should configure DI through the kernel:

```ts
const kernel = new Kernel();

await kernel.dependencyInjection({
  containerBuild: process.env.NODE_ENV !== 'production',
});
```

Use `DependencyInjection` directly only when a test or custom runtime needs to
build the container without a full kernel instance.

```ts
import { DependencyInjection } from '@haskou/ddd-kernel/dependency-injection';

const di = DependencyInjection.configure({
  containerBuild: process.env.CONTAINER_BUILD === 'true',
  servicesYamlPath: 'config/container/services.yaml',
  sourceDirectory: 'src',
});

await di.compile();
```

## Options

| Option             | Required                                       | Purpose                                                                                                                                                                               |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `containerBuild`   | No                                             | Regenerate `services.yaml` from default-exported classes when `true`; load the existing YAML when `false`. If omitted through the kernel, `CONTAINER_BUILD=true` is used as fallback. |
| `servicesYamlPath` | Yes for direct `DependencyInjection.configure` | Path to the generated or committed container YAML file.                                                                                                                               |
| `sourceDirectory`  | Yes for direct `DependencyInjection.configure` | Source tree scanned when generating the container.                                                                                                                                    |
| `overrides`        | No                                             | Runtime or test replacements applied before container compilation.                                                                                                                    |

The generated container follows the project convention: one default-exported
class per file. Application classes should receive dependencies through their
constructor.

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

## External Package Contracts

`node-dependency-injection` can encode constructor dependencies imported from
external packages as unresolved service references. For example, a dependency
imported from `@haskou/ddd-kernel/domain` can appear in generated container
metadata as if it were a local path under the application source tree.

Overrides also cover those unresolved references. If an argument reference ends
with the overridden token class name, the container aliases that reference to
the configured override implementation:

```ts
import { DomainEventPublisher } from '@haskou/ddd-kernel/domain';
import MessageBus from '@haskou/ddd-kernel/adapters/pubsub/amqp';

await kernel.dependencyInjection({
  overrides: [
    {
      token: DomainEventPublisher,
      useClass: MessageBus,
    },
  ],
});
```

This avoids local bridge contracts or hand-written aliases when applications
inject contracts exported by this package.
