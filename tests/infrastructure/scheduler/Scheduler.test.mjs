import assert from 'node:assert/strict';
import test from 'node:test';

import { Kernel } from '../../../dist/index.js';
import { Scheduler } from '../../../dist/infrastructure/scheduler/index.js';

class TestScheduler extends Scheduler {
  constructor(errorPolicy, calls = []) {
    super(errorPolicy);
    this.calls = calls;
    this.cronExpression = {
      dayOfMonth: '4',
      dayOfWeek: '5',
      hour: '3',
      minute: '2',
      month: '6',
      second: '1',
    };
  }

  async execute() {
    this.calls.push('execute');
  }

  getCronExpression() {
    return this.cronExpression;
  }

  getProcessName() {
    return 'test-scheduler';
  }
}

test('runs the scheduler once and logs debug information', async () => {
  const calls = [];
  new Kernel({
    logger: {
      debug: (message) => calls.push(['debug', message]),
      error: (message) => calls.push(['error', message]),
      info: () => {},
      warn: () => {},
    },
  });
  const scheduler = new TestScheduler(undefined, calls);

  await scheduler.runOnce();

  assert.deepEqual(calls, [
    ['debug', 'Scheduler: Executing test-scheduler'],
    'execute',
  ]);
});

test('delegates handled execution errors to the configured policy', async () => {
  const error = new Error('failed');
  const calls = [];
  const scheduler = new (class extends TestScheduler {
    async execute() {
      throw error;
    }
  })({
    handle: async (receivedError, receivedScheduler) => {
      calls.push([receivedError, receivedScheduler]);
    },
    shouldSkip: () => false,
  });

  await scheduler.runOnce();

  assert.deepEqual(calls, [[error, scheduler]]);
});

test('skips errors when policy marks them as skippable', async () => {
  const calls = [];
  const scheduler = new (class extends TestScheduler {
    async execute() {
      throw new Error('skip');
    }
  })({
    handle: async () => calls.push('handle'),
    shouldSkip: () => true,
  });

  await scheduler.runOnce();

  assert.deepEqual(calls, []);
});

test('schedules the parsed cron expression', async (context) => {
  const cron = await import('node-cron');
  const originalSchedule = cron.default.schedule;
  const calls = [];
  const scheduler = new TestScheduler(undefined, calls);

  cron.default.schedule = (expression, callback) => {
    calls.push(expression);
    callback();

    return {};
  };
  context.after(() => {
    cron.default.schedule = originalSchedule;
  });

  await scheduler.init();

  assert.equal(calls[0], '1 2 3 4 6 5');
});

test('throws a scheduler-specific error when cron expression cannot be parsed', async () => {
  const scheduler = new (class extends TestScheduler {
    getCronExpression() {
      throw new Error('invalid');
    }
  })();

  assert.throws(() => scheduler.init(), /Invalid cron expression/);
});

test('uses wildcards for omitted cron expression parts', async (context) => {
  const cron = await import('node-cron');
  const originalSchedule = cron.default.schedule;
  const calls = [];
  const scheduler = new (class extends TestScheduler {
    getCronExpression() {
      return {};
    }
  })();

  cron.default.schedule = (expression) => {
    calls.push(expression);

    return {};
  };
  context.after(() => {
    cron.default.schedule = originalSchedule;
  });

  await scheduler.init();

  assert.deepEqual(calls, ['* * * * * *']);
});

test('resolves legacy services through the active kernel container', () => {
  class Service {}

  const service = new Service();
  new Kernel({
    di: {
      getService(requestedService) {
        assert.equal(requestedService, Service);

        return service;
      },
    },
  });

  const scheduler = new TestScheduler();

  assert.equal(scheduler.get(Service), service);
});
