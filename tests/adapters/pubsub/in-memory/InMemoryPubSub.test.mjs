import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryPubSub } from '../../../../dist/adapters/pubsub/in-memory/index.js';

test('publishes messages to subscribers and supports unsubscribe', async () => {
  const context = { di: {}, publish: async () => {} };
  const message = { name: 'message' };
  const calls = [];
  const pubSub = new InMemoryPubSub(context);

  const subscription = await pubSub.subscribe('topic', async (receivedMessage, receivedContext) => {
    calls.push([receivedMessage, receivedContext]);
  });

  await pubSub.publish('topic', message);
  await pubSub.publish('other-topic', message);
  await subscription.close();
  await pubSub.publish('topic', message);

  assert.deepEqual(calls, [[message, context]]);
});
