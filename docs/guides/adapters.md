# Writing Adapters

Adapters live under the same high-level groups as contracts:

- `adapters/pubsub` implements domain event transport.
- `adapters/db` implements persistence primitives.
- `adapters/ui` implements HTTP/UI runtime concerns.
- `adapters/kernel` implements kernel-level defaults such as logging.

An adapter should implement a contract or abstract class from the domain/kernel
surface and stay free of application-specific concepts.

The core kernel owns lifecycle and dependency injection. It should not know
about concrete HTTP frameworks, AMQP clients, Mongo drivers or Winston loggers.
Those belong in optional adapters and should be imported only by applications
that need them.

```ts
import type { DomainEventPublisher } from '@haskou/ddd-kernel/domain';

export default class MyPublisher implements DomainEventPublisher {
  public async publish(events) {
    // Serialize and send through your transport.
  }
}
```

If an adapter needs a third-party dependency, expose it through a subpath and
mark that dependency as an optional peer dependency.

## Choosing Adapters Per Runtime

Applications can keep several adapters for the same contract and choose one at
bootstrap time with dependency injection overrides. This is useful for tests,
local development or deployments that swap infrastructure without changing the
domain code.

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

For tests, overriding with a specific instance keeps assertions simple:

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

The classes that need `UserRepository` should still receive it through
constructor injection. The adapter decision belongs in bootstrap or test setup,
not inside consumers, schedulers or routes.

## Message Bus Hooks

Message bus adapters can expose publisher hooks so applications can attach
replicated publishers, websocket notifications, tracing or auditing without
wrapping the adapter in an application-local class.

```ts
import AmqpMessageBusAdapter from '@haskou/ddd-kernel/adapters/pubsub/amqp';

const messageBus = new AmqpMessageBusAdapter({
  publisherHookErrorPolicy: {
    handleAfterPublishError(error, context) {
      logger.error(
        `Post-publish hook failed for ${context.topic}: ${String(error)}`,
      );
    },
    shouldFailAfterPublish() {
      return false;
    },
  },
  publisherHooks: [
    {
      afterPublish: async ({ domainEvent, message }) => {
        await websocketPublisher.publish(domainEvent ?? message);
      },
    },
  ],
});
```

Custom generic adapters should implement the `MessageBus` contract. Domain-event
adapters should implement `DomainMessageBus`. Both can delegate hook execution
through `PublisherHookPipeline`:

```ts
import {
  PublisherHookPipeline,
  type PublisherHook,
} from '@haskou/ddd-kernel/adapters/pubsub';

export default class CustomMessageBus {
  private readonly hooks = new PublisherHookPipeline();

  public registerPublisherHooks(...hooks: PublisherHook[]) {
    this.hooks.register(...hooks);
  }
}
```
