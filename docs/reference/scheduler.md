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

Schedulers accept a `SchedulerErrorPolicy` exported from
`@haskou/ddd-kernel/scheduler`:

```ts
import type { SchedulerErrorPolicy } from '@haskou/ddd-kernel/scheduler';

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

Use `shouldSkip` for domain-specific transient states that should not be logged
as scheduler failures, for example replicated state that is not ready yet:

```ts
const policy: SchedulerErrorPolicy = {
  shouldSkip(error) {
    return error instanceof ReplicatedStateNotReadyError;
  },
  handle(error, scheduler) {
    logger.error(`${scheduler.getProcessName()} failed: ${String(error)}`);
  },
};
```

The default policy never skips and wraps failures in `ScheduledExecutionError`.
