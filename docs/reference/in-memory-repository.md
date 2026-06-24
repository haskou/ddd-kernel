# InMemoryRepository

In-memory repository for tests and examples.

```ts
import { InMemoryRepository } from '@haskou/ddd-kernel/adapters/db/in-memory';

const users = new InMemoryRepository<{ id: string }, string>();
```

Entities must expose an `id` property.
