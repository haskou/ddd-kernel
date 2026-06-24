import assert from 'node:assert/strict';
import test from 'node:test';

import { ScheduledExecutionError } from '../../../dist/infrastructure/scheduler/index.js';

test('sets scheduled execution error name and message', () => {
  const error = new ScheduledExecutionError('failed');

  assert.equal(error.name, 'ScheduledExecutionError');
  assert.equal(error.message, 'failed');
});
