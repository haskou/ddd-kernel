import assert from 'node:assert/strict';
import test from 'node:test';

import { Kernel } from '../../../dist/index.js';
import { DefaultSchedulerErrorPolicy } from '../../../dist/infrastructure/scheduler/index.js';

test('logs scheduled execution errors and never skips by default', () => {
  const errors = [];
  const policy = new DefaultSchedulerErrorPolicy();
  const scheduler = {
    getProcessName: () => 'sync-state',
  };

  new Kernel({
    logger: {
      debug: () => {},
      error: (message) => errors.push(message),
      info: () => {},
      warn: () => {},
    },
  });

  assert.equal(policy.shouldSkip(new Error('ignored')), false);

  policy.handle(new Error('not ready'), scheduler);
  policy.handle('not ready', scheduler);

  assert.deepEqual(errors, [
    'Error on sync-state: not ready',
    'Error on sync-state: not ready',
  ]);
});
