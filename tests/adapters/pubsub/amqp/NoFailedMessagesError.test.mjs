import assert from 'node:assert/strict';
import test from 'node:test';

import { NoFailedMessagesError } from '../../../../dist/adapters/pubsub/amqp/index.js';

test('describes empty DLX queues', () => {
  const error = new NoFailedMessagesError('users_dlx');

  assert.equal(error.name, 'NoFailedMessagesError');
  assert.equal(error.message, 'No failed messages found in "users_dlx".');
});
