# Scheduler

Base class for recurring jobs.

```ts
import Scheduler from '@haskou/ddd-kernel/scheduler';

export default class UserCleanupScheduler extends Scheduler {
  public getProcessName(): string {
    return 'user-cleanup';
  }
}
```

Register scheduler classes with `kernel.registerSchedulers(...)`.
