import assert from 'node:assert/strict';
import test from 'node:test';

import { HandlerNotFoundError } from '../../dist/errors/index.js';

test('describes the missing handler kind and name', () => {
  const error = new HandlerNotFoundError('event', 'user.created');

  assert.equal(error.name, 'HandlerNotFoundError');
  assert.equal(error.message, 'event handler not found for "user.created".');
});
