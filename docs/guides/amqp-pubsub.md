# AMQP Pub/Sub

`AmqpMessageBusAdapter` implements both `DomainEventConsumer` and
`DomainEventPublisher`.

```ts
import AmqpMessageBusAdapter from '@haskou/ddd-kernel/adapters/pubsub/amqp';

export default class MessageBus extends AmqpMessageBusAdapter {}
```

Configuration can come from constructor options or environment variables:

```ts
new AmqpMessageBusAdapter({
  dsn: 'amqp://localhost',
  exchange: 'users-service',
  maxRetries: 3,
  retryDelayInMilliseconds: 1000,
  serviceName: 'users-service',
});
```

Environment variables:

- `TRANSPORT_DSN`
- `TRANSPORT_MAX_RETRIES`
- `TRANSPORT_RETRY_DELAY`
- `SERVICE_NAME`

Failed messages are sent to `<queue>_dlx`. Use `consumeDlx` to retry failed
messages.
