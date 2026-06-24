# DependencyInjection

Wrapper around `node-dependency-injection`.

```ts
import { DependencyInjection } from '@haskou/ddd-kernel/dependency-injection';

const di = DependencyInjection.configure({
  containerBuild: process.env.CONTAINER_BUILD === 'true',
  servicesYamlPath: 'config/container/services.yaml',
  sourceDirectory: 'src',
});

await di.compile();
```

Most applications call `kernel.dependencyInjection()` instead.
