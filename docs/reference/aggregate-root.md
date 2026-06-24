# AggregateRoot

Base class for aggregates that record domain events.

```ts
import { AggregateRoot } from '@haskou/ddd-kernel/domain';

export default class User extends AggregateRoot {
  public toPrimitives() {
    return {};
  }
}
```

Use `record(event)` inside state-changing aggregate behavior and
`pullDomainEvents()` after persistence/publishing.
