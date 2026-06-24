import assert from 'node:assert/strict';
import test from 'node:test';

import { KernelError } from '../../dist/errors/index.js';

test('sets the kernel error name', () => {
  const error = new KernelError('failed');

  assert.equal(error.name, 'KernelError');
  assert.equal(error.message, 'failed');
});
