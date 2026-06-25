# Consumer

Base class for application pub/sub consumers.

```ts
import Consumer from '@haskou/ddd-kernel/adapters/pubsub';

export default class RegisterUserWhenCreated extends Consumer {
  public get queueName() {
    return 'users.register-user';
  }
}
```

Consumers are registered by class:

```ts
kernel.registerConsumers(RegisterUserWhenCreated);
```

## Middleware

Register consumer middleware when you need idempotency, retries, tracing or
correlation IDs around handler execution:

```ts
kernel.registerConsumerMiddleware({
  async handle(event, next, context) {
    logger.info(`Handling ${context.eventName}`);
    await next();
  },
});
```

Middleware receives the event, the next pipeline callback and a
`ConsumerExecutionContext` containing queue, exchange, event id, correlation id
and causation id.

## Built-in Middleware

The pub/sub adapter package includes small middleware implementations for common
consumer concerns. They are intentionally infrastructure-level primitives, not a
full outbox implementation.

```ts
import {
  CorrelationConsumerMiddleware,
  IdempotencyConsumerMiddleware,
  InMemoryIdempotencyStore,
  RetryConsumerMiddleware,
} from '@haskou/ddd-kernel/adapters/pubsub';

kernel.registerConsumerMiddleware(
  new CorrelationConsumerMiddleware(),
  new IdempotencyConsumerMiddleware({
    store: new InMemoryIdempotencyStore(),
  }),
  new RetryConsumerMiddleware({
    maxAttempts: 3,
  }),
);
```

Use a custom `IdempotencyStore` for durable idempotency. The in-memory store is
only useful for tests and single-process applications.
