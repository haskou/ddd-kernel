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
  async handle(event, next) {
    await next();
  },
});
```

Middleware receives the event and a `next` callback. The kernel does not include
a full outbox or idempotency implementation.
