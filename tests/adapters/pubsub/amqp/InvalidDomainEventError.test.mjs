import assert from 'node:assert/strict';
import test from 'node:test';

import { InvalidDomainEventError } from '../../../../dist/adapters/pubsub/amqp/index.js';

test('describes invalid AMQP domain event payloads', () => {
  const error = new InvalidDomainEventError('null');

  assert.equal(error.name, 'InvalidDomainEventError');
  assert.equal(error.message, 'Invalid domain event: null');
});
