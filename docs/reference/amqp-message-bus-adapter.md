# AmqpMessageBusAdapter

AMQP adapter for publishing and consuming domain events.

```ts
import AmqpMessageBusAdapter from '@haskou/ddd-kernel/adapters/pubsub/amqp';

const adapter = new AmqpMessageBusAdapter({
  dsn: 'amqp://localhost',
  exchange: 'users-service',
});
```

It supports:

- Topic exchanges.
- Retry queues with delayed redelivery.
- Dead-letter queues using `<queue>_dlx`.
- `consumeDlx` for retrying failed messages.
