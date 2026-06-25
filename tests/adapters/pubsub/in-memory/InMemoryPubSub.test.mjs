import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryPubSub } from '../../../../dist/adapters/pubsub/in-memory/index.js';

test('publishes messages to subscribers and supports unsubscribe', async () => {
  const context = { di: {}, publish: async () => {} };
  const message = { name: 'message' };
  const calls = [];
  const pubSub = new InMemoryPubSub(context);

  const subscription = await pubSub.subscribe(
    'topic',
    async (receivedMessage, receivedContext) => {
      calls.push([receivedMessage, receivedContext]);
    },
  );

  await pubSub.publish('topic', message);
  await pubSub.publish('other-topic', message);
  await subscription.close();
  await pubSub.publish('topic', message);

  assert.deepEqual(calls, [[message, context]]);
});

test('runs publisher hooks around published messages', async () => {
  const context = { di: {}, publish: async () => {} };
  const message = {
    metadata: { correlationId: 'correlation-id' },
    name: 'message',
  };
  const calls = [];
  const pubSub = new InMemoryPubSub(context, [
    {
      afterPublish: (publishContext) =>
        calls.push(['after', publishContext.topic]),
      beforePublish: (publishContext) =>
        calls.push(['before', publishContext.metadata.correlationId]),
    },
  ]);

  pubSub.registerPublisherHooks({
    afterPublish: (publishContext) =>
      calls.push(['registered', publishContext.message.name]),
  });
  await pubSub.subscribe('topic', async (receivedMessage) => {
    calls.push(['consumer', receivedMessage.name]);
  });

  await pubSub.publish('topic', message);

  assert.deepEqual(calls, [
    ['before', 'correlation-id'],
    ['consumer', 'message'],
    ['after', 'topic'],
    ['registered', 'message'],
  ]);
});

test('runs publisher error hooks before rethrowing', async () => {
  const context = { di: {}, publish: async () => {} };
  const error = new Error('publish failed');
  const calls = [];
  const pubSub = new InMemoryPubSub(context, [
    {
      onPublishError: (publishError, publishContext) =>
        calls.push([publishError, publishContext.topic]),
    },
  ]);

  await pubSub.subscribe('topic', async () => {
    throw error;
  });

  await assert.rejects(
    () => pubSub.publish('topic', { name: 'message' }),
    error,
  );
  assert.deepEqual(calls, [[error, 'topic']]);
});
