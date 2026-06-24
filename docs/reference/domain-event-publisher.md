# DomainEventPublisher

Abstract transport contract for publishing domain events.

```ts
import { DomainEventPublisher } from '@haskou/ddd-kernel/domain';
```

Adapters such as `AmqpMessageBusAdapter` implement this contract.
