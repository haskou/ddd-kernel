# Route

Base class for HTTP routes.

```ts
import Route from '@haskou/ddd-kernel/adapters/ui/routes';

export default class GetUserRoute extends Route {
  private readonly finder = this.get<UserFinder>(UserFinder);
}
```

`get<T>()` resolves services through `Kernel.di`.
