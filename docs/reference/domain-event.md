# DomainEvent

Base class for serializable domain events.

```ts
import { DomainEvent } from '@haskou/ddd-kernel/domain';

export default class UserCreated extends DomainEvent {
  public eventName(): string {
    return 'users.created';
  }
}
```

`decode()` serializes event metadata and attributes for transports such as AMQP.
