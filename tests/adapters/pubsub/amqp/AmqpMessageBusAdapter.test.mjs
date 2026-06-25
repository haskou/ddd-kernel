import assert from 'node:assert/strict';
import test from 'node:test';

import amqplib from 'amqplib';

import { Kernel } from '../../../../dist/index.js';
import { TestDomainEvent } from '../../../helpers/TestDomainEvent.mjs';

const createMessage = (overrides = {}) => ({
  aggregate_id: 'aggregate-id',
  attributes: { name: 'Ada' },
  causation_id: 'causation-id',
  correlation_id: 'correlation-id',
  event_id: 'event-id',
  occurred_on: new Date('2026-06-24T10:00:00.000Z').toISOString(),
  ...overrides,
});

const createConsumeMessage = (message, headers = {}) => ({
  content: Buffer.from(JSON.stringify(message)),
  properties: { headers },
});

class FakeChannel {
  constructor() {
    this.OPEN = 1;
    this.calls = [];
    this.consumers = [];
    this.getMessages = [];
    this.messageCount = 0;
    this.consumerCount = 0;
    this.eventHandlers = new Map();
    this.publishError = undefined;
  }

  ack(message) {
    this.calls.push(['ack', message]);
  }

  assertExchange(exchange, type, options) {
    this.calls.push(['assertExchange', exchange, type, options]);
  }

  assertQueue(queueName, options) {
    this.calls.push(['assertQueue', queueName, options]);
  }

  bindQueue(queueName, exchange, bindingKey) {
    this.calls.push(['bindQueue', queueName, exchange, bindingKey]);
  }

  cancel(consumerTag) {
    this.calls.push(['cancel', consumerTag]);
  }

  checkQueue(queueName) {
    this.calls.push(['checkQueue', queueName]);

    return {
      consumerCount: this.consumerCount,
      messageCount: this.messageCount,
    };
  }

  close() {
    this.calls.push(['channel:close']);
  }

  consume(queueName, handler, options) {
    this.calls.push(['consume', queueName, options]);
    this.consumers.push(handler);
  }

  get(queueName) {
    this.calls.push(['get', queueName]);

    return this.getMessages.shift() ?? false;
  }

  nack(message) {
    this.calls.push(['nack', message]);
  }

  on(eventName, handler) {
    this.calls.push(['on', eventName]);
    this.eventHandlers.set(eventName, handler);

    return this;
  }

  prefetch(count) {
    this.calls.push(['prefetch', count]);
  }

  publish(exchange, routingKey, content, options) {
    this.calls.push([
      'publish',
      exchange,
      routingKey,
      JSON.parse(content.toString()),
      options,
    ]);

    if (this.publishError) {
      throw this.publishError;
    }
  }
}

class FakeConnection {
  constructor(channel) {
    this.channel = channel;
    this.calls = [];
  }

  close() {
    this.calls.push(['connection:close']);
  }

  createChannel() {
    return this.channel;
  }
}

const withAmqpConnect = async (channel, run) => {
  const originalConnect = amqplib.connect;
  const connection = new FakeConnection(channel);

  amqplib.connect = async () => connection;

  try {
    return await run(connection);
  } finally {
    amqplib.connect = originalConnect;
  }
};

test('publishes domain events and closes channel resources', async () => {
  const channel = new FakeChannel();
  const hookCalls = [];
  const { default: AmqpMessageBusAdapter } =
    await import('../../../../dist/adapters/pubsub/amqp/index.js');
  const adapter = new AmqpMessageBusAdapter({
    dsn: 'amqp://localhost',
    exchange: 'domain',
    serviceName: 'service',
  });
  adapter.registerPublisherHooks({
    afterPublish: (context) =>
      hookCalls.push(['after', context.topic, context.domainEvent]),
    beforePublish: (context) =>
      hookCalls.push(['before', context.topic, context.domainEvent]),
  });
  const event = new TestDomainEvent(
    'aggregate-id',
    { name: 'Ada' },
    'event-id',
    new Date('2026-06-24T10:00:00.000Z'),
  );

  await withAmqpConnect(channel, async (connection) => {
    await adapter.publish([event]);
    await adapter.close();

    assert.equal(connection.calls.length, 1);
  });

  assert.equal(
    channel.calls.some(([name]) => name === 'publish'),
    true,
  );
  assert.equal(
    channel.calls.some(([name]) => name === 'channel:close'),
    true,
  );
  assert.deepEqual(hookCalls, [
    ['before', 'test.domain-event', event],
    ['after', 'test.domain-event', event],
  ]);
});

test('consumes AMQP messages and acknowledges handled events', async () => {
  const channel = new FakeChannel();
  const handled = [];
  const { default: AmqpMessageBusAdapter } =
    await import('../../../../dist/adapters/pubsub/amqp/index.js');
  const adapter = new AmqpMessageBusAdapter({
    dsn: 'amqp://localhost',
    exchange: 'domain',
  });
  const message = createConsumeMessage(createMessage(), {
    retries: 2,
    traceId: 'trace-id',
  });

  await withAmqpConnect(channel, async () => {
    await adapter.consume(
      'queue',
      'test.domain-event',
      TestDomainEvent,
      'domain',
      async (event, context) => handled.push([event, context]),
    );

    await channel.consumers[0](null);
    await channel.consumers[0](message);
  });

  assert.equal(handled[0][0] instanceof TestDomainEvent, true);
  assert.deepEqual(handled[0][1].metadata.headers, {
    retries: 2,
    traceId: 'trace-id',
  });
  assert.equal(handled[0][1].metadata.rawMessage, message);
  assert.equal(handled[0][1].metadata.retries, 2);
  assert.deepEqual(channel.calls.at(-1), ['ack', message]);
});

test('consumes AMQP messages without headers metadata', async () => {
  const channel = new FakeChannel();
  const handled = [];
  const { default: AmqpMessageBusAdapter } =
    await import('../../../../dist/adapters/pubsub/amqp/index.js');
  const adapter = new AmqpMessageBusAdapter({
    dsn: 'amqp://localhost',
    exchange: 'domain',
  });
  const message = {
    content: Buffer.from(JSON.stringify(createMessage())),
    properties: {},
  };

  await withAmqpConnect(channel, async () => {
    await adapter.consume(
      'queue',
      'test.domain-event',
      TestDomainEvent,
      'domain',
      async (event, context) => {
        void event;
        handled.push(context);
      },
    );

    await channel.consumers[0](message);
  });

  assert.deepEqual(handled[0].metadata.headers, {});
  assert.equal(handled[0].metadata.retries, 0);
});

test('retries failed messages and registers delayed consumers once', async () => {
  const channel = new FakeChannel();
  const logs = [];
  const { default: AmqpMessageBusAdapter } =
    await import('../../../../dist/adapters/pubsub/amqp/index.js');
  const adapter = new AmqpMessageBusAdapter({
    exchange: 'domain',
    logger: {
      debug: () => {},
      error: (message) => logs.push(['error', message]),
      info: (message) => logs.push(['info', message]),
      warn: () => {},
    },
    maxRetries: 2,
    retryDelayInMilliseconds: 0,
  });
  const context = {
    bindingKey: 'test.domain-event',
    channel,
    DomainEventInstance: TestDomainEvent,
    handler: async () => {},
    queueName: 'queue',
  };
  const message = createMessage();

  await adapter.handleError(
    { properties: { headers: { retries: 1 } } },
    message,
    context,
    new Error('failed'),
  );
  await adapter.handleError(
    { properties: { headers: { retries: 1 } } },
    message,
    context,
    'failed',
  );

  assert.equal(channel.calls.filter(([name]) => name === 'consume').length, 1);
  assert.equal(channel.calls.filter(([name]) => name === 'publish').length, 2);
  assert.equal(
    logs.some(([, messageText]) => messageText === 'Retry # 1'),
    true,
  );
});

test('sends exhausted messages to DLX and logs publish failures', async () => {
  const channel = new FakeChannel();
  const logs = [];
  const { default: AmqpMessageBusAdapter } =
    await import('../../../../dist/adapters/pubsub/amqp/index.js');
  const adapter = new AmqpMessageBusAdapter({
    exchange: 'domain',
    logger: {
      debug: () => {},
      error: (message) => logs.push(message),
      info: () => {},
      warn: () => {},
    },
    maxRetries: 0,
  });
  const context = {
    bindingKey: 'test.domain-event',
    channel,
    DomainEventInstance: TestDomainEvent,
    handler: async () => {},
    queueName: 'queue',
  };

  channel.publishError = new Error('publish failed');

  await adapter.handleError(
    { properties: { headers: { retries: 2 } } },
    createMessage({ retries: 2 }),
    context,
    new Error('failed'),
  );

  assert.deepEqual(logs, ['failed', 'publish failed']);
});

test('consumes DLX messages with success, nack and no-message paths', async () => {
  const channel = new FakeChannel();
  const handled = [];
  const { default: AmqpMessageBusAdapter, NoFailedMessagesError } =
    await import('../../../../dist/adapters/pubsub/amqp/index.js');
  const adapter = new AmqpMessageBusAdapter({
    dsn: 'amqp://localhost?frameMax=0',
    exchange: 'domain',
  });
  const successMessage = createConsumeMessage(createMessage(), {
    retries: 3,
    traceId: 'dlx-trace-id',
  });
  const failingMessage = {
    content: Buffer.from('{'),
    properties: { headers: {} },
  };

  await withAmqpConnect(channel, async () => {
    channel.messageCount = 3;
    channel.getMessages = [false, successMessage, failingMessage];

    await adapter.consumeDlx(
      'queue',
      TestDomainEvent,
      async (event, context) => handled.push([event, context]),
      3,
    );
    channel.eventHandlers.get('error')();

    channel.messageCount = 0;

    await assert.rejects(
      () => adapter.consumeDlx('queue', TestDomainEvent, async () => {}),
      NoFailedMessagesError,
    );
  });

  assert.equal(
    channel.calls.some(([name]) => name === 'ack'),
    true,
  );
  assert.equal(handled[0][0] instanceof TestDomainEvent, true);
  assert.deepEqual(handled[0][1].metadata.headers, {
    retries: 3,
    traceId: 'dlx-trace-id',
  });
  assert.equal(handled[0][1].metadata.rawMessage, successMessage);
  assert.equal(handled[0][1].metadata.retries, 3);
  assert.equal(
    channel.calls.some(([name]) => name === 'nack'),
    true,
  );
});

test('checks queue bindings for registered consumers', async () => {
  const channel = new FakeChannel();
  const { default: AmqpMessageBusAdapter } =
    await import('../../../../dist/adapters/pubsub/amqp/index.js');
  const adapter = new AmqpMessageBusAdapter({ dsn: 'amqp://localhost' });
  const kernel = new Kernel();

  kernel.removeConsumers();

  assert.equal(await adapter.areQueuesBound(), false);

  kernel.registerConsumerInstances({ queueName: 'queue' });

  await withAmqpConnect(channel, async () => {
    channel.consumerCount = 1;
    assert.equal(await adapter.areQueuesBound(), false);

    channel.consumerCount = 0;
    assert.equal(await adapter.areQueuesBound(), true);
  });
});

test('uses environment retry delay and logs non-Error DLX retry failures', async () => {
  const previousRetryDelay = process.env.TRANSPORT_RETRY_DELAY;
  const channel = new FakeChannel();
  const logs = [];
  const { default: AmqpMessageBusAdapter } =
    await import('../../../../dist/adapters/pubsub/amqp/index.js');
  const adapter = new AmqpMessageBusAdapter({
    exchange: 'domain',
    logger: {
      debug: () => {},
      error: (message) => logs.push(message),
      info: () => {},
      warn: () => {},
    },
  });

  process.env.TRANSPORT_RETRY_DELAY = 'not-a-number';

  try {
    await adapter.retryDlxMessage(
      createConsumeMessage(createMessage()),
      TestDomainEvent,
      async () => {
        throw 'string failure';
      },
      channel,
    );

    assert.deepEqual(logs, [
      '{"aggregate_id":"aggregate-id","attributes":{"name":"Ada"},"causation_id":"causation-id","correlation_id":"correlation-id","event_id":"event-id","occurred_on":"2026-06-24T10:00:00.000Z"} error with string failure.',
    ]);
    assert.equal(adapter.retryDelayInMilliseconds, 1000);
  } finally {
    if (previousRetryDelay === undefined) {
      delete process.env.TRANSPORT_RETRY_DELAY;
    } else {
      process.env.TRANSPORT_RETRY_DELAY = previousRetryDelay;
    }
  }
});

test('handles missing retry headers and cancels delayed consumers on invalid retry payloads', async () => {
  const channel = new FakeChannel();
  const logs = [];
  const { default: AmqpMessageBusAdapter } =
    await import('../../../../dist/adapters/pubsub/amqp/index.js');
  const adapter = new AmqpMessageBusAdapter({
    exchange: 'domain',
    logger: {
      debug: () => {},
      error: (message) => logs.push(message),
      info: () => {},
      warn: () => {},
    },
    maxRetries: 1,
    retryDelayInMilliseconds: 0,
  });
  const context = {
    bindingKey: 'test.domain-event',
    channel,
    DomainEventInstance: TestDomainEvent,
    handler: async () => {},
    queueName: 'queue',
  };

  await adapter.handleError(
    { properties: {} },
    createMessage(),
    context,
    new Error('failed'),
  );
  await adapter.retry(null, {}, context);

  assert.equal(
    channel.calls.some(([name]) => name === 'cancel'),
    true,
  );
  assert.equal(logs.includes('Invalid domain event: null'), true);
});

test('handles AMQP messages that fail during handler execution', async () => {
  const channel = new FakeChannel();
  const logs = [];
  const { default: AmqpMessageBusAdapter } =
    await import('../../../../dist/adapters/pubsub/amqp/index.js');
  const adapter = new AmqpMessageBusAdapter({
    exchange: 'domain',
    logger: {
      debug: () => {},
      error: (message) => logs.push(message),
      info: () => {},
      warn: () => {},
    },
    maxRetries: 0,
  });
  const context = {
    bindingKey: 'test.domain-event',
    channel,
    DomainEventInstance: TestDomainEvent,
    handler: async () => {
      throw new Error('handler failed');
    },
    queueName: 'queue',
  };

  await adapter.handle(createConsumeMessage(createMessage()), context);

  assert.equal(logs.includes('handler failed'), true);
});

test('supports AMQP messages without occurred_on and retry publish errors', async () => {
  const channel = new FakeChannel();
  const logs = [];
  const { default: AmqpMessageBusAdapter } =
    await import('../../../../dist/adapters/pubsub/amqp/index.js');
  const adapter = new AmqpMessageBusAdapter({
    exchange: 'domain',
    logger: {
      debug: () => {},
      error: (message) => logs.push(message),
      info: () => {},
      warn: () => {},
    },
    retryDelayInMilliseconds: 0,
  });
  const context = {
    bindingKey: 'test.domain-event',
    channel,
    DomainEventInstance: TestDomainEvent,
    handler: async () => {},
    queueName: 'queue',
  };
  const message = createMessage({ occurred_on: undefined });

  assert.ok(adapter.instanceDomainEvent(TestDomainEvent, message).occurredOn);

  channel.publishError = new Error('retry publish failed');

  await adapter.retry(message, { retries: 1 }, context);

  assert.equal(logs.includes('retry publish failed'), true);
});

test('uses numeric retry delay from environment', async () => {
  const previousRetryDelay = process.env.TRANSPORT_RETRY_DELAY;
  const { default: AmqpMessageBusAdapter } =
    await import('../../../../dist/adapters/pubsub/amqp/index.js');

  process.env.TRANSPORT_RETRY_DELAY = '25';

  try {
    const adapter = new AmqpMessageBusAdapter();

    assert.equal(adapter.retryDelayInMilliseconds, 25);
  } finally {
    if (previousRetryDelay === undefined) {
      delete process.env.TRANSPORT_RETRY_DELAY;
    } else {
      process.env.TRANSPORT_RETRY_DELAY = previousRetryDelay;
    }
  }
});

test('reads AMQP DSN and max retries from environment defaults', async () => {
  const previousDsn = process.env.TRANSPORT_DSN;
  const previousRetries = process.env.TRANSPORT_MAX_RETRIES;
  const { default: AmqpMessageBusAdapter } =
    await import('../../../../dist/adapters/pubsub/amqp/index.js');

  delete process.env.TRANSPORT_MAX_RETRIES;
  process.env.TRANSPORT_DSN = 'amqp://environment';

  try {
    const adapter = new AmqpMessageBusAdapter();

    assert.equal(adapter.getConnectionDsn(), 'amqp://environment?heartbeat=60');
    assert.equal(adapter.maxRetries, undefined);

    delete process.env.TRANSPORT_DSN;

    assert.equal(adapter.getConnectionDsn(), '?heartbeat=60');

    process.env.TRANSPORT_MAX_RETRIES = '4';

    assert.equal(adapter.maxRetries, 4);
  } finally {
    if (previousDsn === undefined) {
      delete process.env.TRANSPORT_DSN;
    } else {
      process.env.TRANSPORT_DSN = previousDsn;
    }

    if (previousRetries === undefined) {
      delete process.env.TRANSPORT_MAX_RETRIES;
    } else {
      process.env.TRANSPORT_MAX_RETRIES = previousRetries;
    }
  }
});

test('handles delayed consumer messages and removes delayed consumer state', async () => {
  const channel = new FakeChannel();
  const handled = [];
  const { default: AmqpMessageBusAdapter } =
    await import('../../../../dist/adapters/pubsub/amqp/index.js');
  const adapter = new AmqpMessageBusAdapter({
    exchange: 'domain',
    retryDelayInMilliseconds: 0,
  });
  const context = {
    bindingKey: 'test.domain-event',
    channel,
    DomainEventInstance: TestDomainEvent,
    handler: async (event) => handled.push(event),
    queueName: 'queue',
  };

  await adapter.retry(createMessage(), { retries: 1 }, context);
  await channel.consumers[0](null);
  await channel.consumers[0](createConsumeMessage(createMessage()));

  assert.equal(handled[0] instanceof TestDomainEvent, true);
  assert.equal(adapter.delayConsumers.length, 0);
});

test('logs non-Error retry publish failures', async () => {
  class ThrowingDomainEvent extends TestDomainEvent {
    constructor() {
      throw 'domain construction failed';
    }
  }

  const channel = new FakeChannel();
  const logs = [];
  const { default: AmqpMessageBusAdapter } =
    await import('../../../../dist/adapters/pubsub/amqp/index.js');
  const adapter = new AmqpMessageBusAdapter({
    exchange: 'domain',
    logger: {
      debug: () => {},
      error: (message) => logs.push(message),
      info: () => {},
      warn: () => {},
    },
    retryDelayInMilliseconds: 0,
  });

  await adapter.retry(
    createMessage(),
    { retries: 1 },
    {
      bindingKey: 'test.domain-event',
      channel,
      DomainEventInstance: ThrowingDomainEvent,
      handler: async () => {},
      queueName: 'queue',
    },
  );

  assert.equal(logs.includes('domain construction failed'), true);
});

test('logs string publish failures when sending to DLX', async () => {
  const channel = new FakeChannel();
  const logs = [];
  const { default: AmqpMessageBusAdapter } =
    await import('../../../../dist/adapters/pubsub/amqp/index.js');
  const adapter = new AmqpMessageBusAdapter({
    exchange: 'domain',
    logger: {
      debug: () => {},
      error: (message) => logs.push(message),
      info: () => {},
      warn: () => {},
    },
  });

  channel.publishError = 'string publish failure';

  await adapter.sendToDlx(createMessage(), {
    bindingKey: 'test.domain-event',
    channel,
    DomainEventInstance: TestDomainEvent,
    handler: async () => {},
    queueName: 'queue',
  });

  assert.deepEqual(logs, ['string publish failure']);
});

test('throws when a channel cannot be created', async () => {
  const { default: AmqpMessageBusAdapter } =
    await import('../../../../dist/adapters/pubsub/amqp/index.js');
  const adapter = new AmqpMessageBusAdapter({ dsn: 'amqp://localhost' });

  adapter.connect = async () => {};

  await assert.rejects(
    () => adapter.channel(),
    /AMQP channel could not be created/,
  );
});

test('reconnects consumers when AMQP channel emits close or error', async () => {
  const channel = new FakeChannel();
  const calls = [];
  const { default: AmqpMessageBusAdapter } =
    await import('../../../../dist/adapters/pubsub/amqp/index.js');
  const adapter = new AmqpMessageBusAdapter({
    dsn: 'amqp://localhost',
    logger: {
      debug: () => {},
      error: (message) => calls.push(['error', message]),
      info: () => {},
      warn: () => {},
    },
  });
  const kernel = new Kernel();

  kernel.removeConsumers();
  kernel.registerConsumerInstances({
    init: async () => calls.push(['consumer:init']),
  });

  await withAmqpConnect(channel, async () => {
    await adapter.channel();
    await channel.eventHandlers.get('close')();
    await channel.eventHandlers.get('error')(new Error('broken'));
  });

  assert.deepEqual(calls, [
    ['error', 'AMQP message bus event close'],
    ['consumer:init'],
    ['error', 'AMQP message bus event error: broken'],
    ['consumer:init'],
  ]);
});
