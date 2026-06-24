import assert from 'node:assert/strict';
import test from 'node:test';

import { InvalidParseCronExpressionError } from '../../../dist/infrastructure/scheduler/index.js';

test('describes the scheduler with an invalid cron expression', () => {
  const error = new InvalidParseCronExpressionError('sync-state');

  assert.equal(error.name, 'InvalidParseCronExpressionError');
  assert.match(error.message, /sync-state/);
});
