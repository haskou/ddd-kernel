import assert from 'node:assert/strict';
import test from 'node:test';

import { BaseError } from '../../dist/domain/index.js';

class TestBaseError extends BaseError {}

test('sets the concrete error name', () => {
  const error = new TestBaseError('failed');

  assert.equal(error.name, 'TestBaseError');
  assert.equal(error.message, 'failed');
  assert.ok(error instanceof Error);
});
