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

`Route` also exposes `get<T>()` to resolve a service from the active kernel
container. Constructor injection is the recommended path because it keeps routes
easier to test.
