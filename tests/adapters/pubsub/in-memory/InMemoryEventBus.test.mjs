import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryEventBus } from '../../../../dist/adapters/pubsub/in-memory/index.js';

test('publishes domain events to subscribed handlers with context', async () => {
  const context = { di: {}, publish: async () => {} };
  const event = { name: 'user.created' };
  const calls = [];
  const eventBus = new InMemoryEventBus(context);

  eventBus.subscribe('user.created', async (receivedEvent, receivedContext) => {
    calls.push([receivedEvent, receivedContext]);
  });

  await eventBus.publish(event);
  await eventBus.publish({ name: 'user.ignored' });

  assert.deepEqual(calls, [[event, context]]);
});
