import assert from 'node:assert/strict';
import test from 'node:test';

import { DependencyNotFoundError } from '../../dist/errors/index.js';

test('describes the missing dependency token', () => {
  const error = new DependencyNotFoundError('UserRepository');

  assert.equal(error.name, 'DependencyNotFoundError');
  assert.equal(
    error.message,
    'Dependency not found for token "UserRepository".',
  );
});
