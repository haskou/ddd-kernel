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

test('does not fail publish when afterPublish hooks fail by default', async () => {
  const context = { di: {}, publish: async () => {} };
  const calls = [];
  const pubSub = new InMemoryPubSub(context, [
    {
      afterPublish: () => {
        throw new Error('websocket failed');
      },
    },
  ]);

  await pubSub.subscribe('topic', async (receivedMessage) => {
    calls.push(['consumer', receivedMessage.name]);
  });

  await pubSub.publish('topic', { name: 'message' });

  assert.deepEqual(calls, [['consumer', 'message']]);
});

test('can fail publish when afterPublish policy asks for it', async () => {
  const context = { di: {}, publish: async () => {} };
  const afterPublishError = new Error('replica failed');
  const policyCalls = [];
  const pubSub = new InMemoryPubSub(
    context,
    [
      {
        afterPublish: () => {
          throw afterPublishError;
        },
      },
    ],
    {
      handleAfterPublishError: (error, publishContext) =>
        policyCalls.push([error, publishContext.topic]),
      shouldFailAfterPublish: () => true,
    },
  );

  await assert.rejects(
    () => pubSub.publish('topic', { name: 'message' }),
    afterPublishError,
  );
  assert.deepEqual(policyCalls, [[afterPublishError, 'topic']]);
});
