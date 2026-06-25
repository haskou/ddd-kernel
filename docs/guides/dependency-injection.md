# Dependency Injection

`DependencyInjection` wraps `node-dependency-injection` and preserves the project
pattern where classes are resolved by class definition:

```ts
const finder = Kernel.di.getService<UserByIdFinder>(UserByIdFinder);
```

That lookup is intended for composition boundaries and compatibility with base
classes. Prefer constructor injection inside application code:

```ts
export default class UserByIdRoute extends Route {
  constructor(private readonly finder: UserByIdFinder) {
    super();
  }
}
```

Classes that should be resolved by the container should be default exports:

```ts
export default class UserByIdFinder {
  constructor(private readonly repository: UserRepository) {}
}
```

You normally do not call `registerFactory`. The generated `services.yaml` is the
composition metadata.

Build the container explicitly from the kernel when you want to regenerate that
metadata:

```ts
await kernel.dependencyInjection({
  containerBuild: process.env.NODE_ENV !== 'production',
});
```

If `containerBuild` is omitted, the kernel falls back to
`CONTAINER_BUILD=true`. That keeps older applications working while allowing new
bootstraps to keep the choice close to application startup code.

Avoid passing `Kernel.di` into consumers, schedulers or services as a normal
dependency. It makes tests depend on global container state and hides the real
collaborators a class needs.
