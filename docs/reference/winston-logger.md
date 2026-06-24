# WinstonLogger

Winston-based logger adapter.

```ts
import { WinstonLogger } from '@haskou/ddd-kernel/logs';

const kernel = new Kernel({
  logger: new WinstonLogger(),
});
```

Use it when you want JSON file logs and formatted console output.
