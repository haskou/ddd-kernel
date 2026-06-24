# Dependency Injection

`DependencyInjection` wraps `node-dependency-injection` and preserves the project
pattern where classes are resolved by class definition:

```ts
const finder = Kernel.di.getService<UserByIdFinder>(UserByIdFinder);
```

Classes that should be resolved by the container should be default exports:

```ts
export default class UserByIdFinder {
  constructor(private readonly repository: UserRepository) {}
}
```

You normally do not call `registerFactory`. The generated `services.yaml` is the
composition metadata.
