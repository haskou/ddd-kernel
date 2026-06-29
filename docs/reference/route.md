# Route

Base class for HTTP routes.

```ts
import Route from '@haskou/ddd-kernel/adapters/ui/routes';

export default class GetUserRoute extends Route {
  constructor(private readonly finder: UserFinder) {
    super();
  }
}
```

Routes are registered with the kernel and resolved through constructor
injection:

```ts
kernel.registerRoutes(GetUserRoute);
```

`Route` extends the core `KernelRoute` contract. HTTP adapters can use that
contract without making the kernel depend on a concrete UI adapter.

`Route` still exposes `get<T>()` for compatibility with older code, but
constructor injection is the recommended path because it keeps routes easier to
test.
