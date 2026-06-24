# ConsoleKernelLogger

Default kernel logger implementation.

```ts
import { ConsoleKernelLogger } from '@haskou/ddd-kernel/adapters/kernel/console';

const kernel = new Kernel({
  logger: new ConsoleKernelLogger(),
});
```

It implements `KernelLogger` with `console.debug`, `console.info`,
`console.warn` and `console.error`.
