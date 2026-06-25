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

## Message Bus Hooks

Message bus adapters can expose publisher hooks so applications can attach
replicated publishers, websocket notifications, tracing or auditing without
wrapping the adapter in an application-local class.

```ts
import AmqpMessageBusAdapter from '@haskou/ddd-kernel/adapters/pubsub/amqp';

const messageBus = new AmqpMessageBusAdapter({
  publisherHooks: [
    {
      afterPublish: async ({ message }) => {
        await websocketPublisher.publish(message);
      },
    },
  ],
});
```

Custom adapters should implement the `MessageBus` contract and delegate hook
execution through `PublisherHookPipeline`:

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
