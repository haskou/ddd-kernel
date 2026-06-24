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

## Error Policy

Schedulers accept a `SchedulerErrorPolicy`:

```ts
class ReplicationScheduler extends Scheduler {
  constructor(errorPolicy: SchedulerErrorPolicy) {
    super(errorPolicy);
  }
}
```

The policy decides whether an error should be skipped and how handled errors are
reported:

```ts
interface SchedulerErrorPolicy {
  shouldSkip(error: unknown): boolean;
  handle(error: unknown, scheduler: Scheduler): Promise<void> | void;
}
```
