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

You usually do not need to configure it explicitly. `Kernel` creates one when
no `logger` option is provided:

```ts
const kernel = new Kernel();

kernel.logger.info('Application running');
```

Use a custom `KernelLogger` or `WinstonLogger` when the application needs
structured logs, files or a central logging backend.
