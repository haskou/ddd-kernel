import assert from 'node:assert/strict';
import test from 'node:test';

import {
  Consumer,
  ConsumerMiddlewarePipeline,
  CorrelationConsumerMiddleware,
  IdempotencyConsumerMiddleware,
  InMemoryIdempotencyStore,
  RetryConsumerMiddleware,
} from '../../../dist/adapters/pubsub/index.js';
import { Kernel } from '../../../dist/index.js';
import { TestDomainEvent } from '../../helpers/TestDomainEvent.mjs';

class TestConsumer extends Consumer {
  constructor(domainEventConsumer, calls) {
    super(domainEventConsumer);
    this.calls = calls;
  }

  get domainEvent() {
    return TestDomainEvent;
  }

  get eventName() {
    return 'test.domain-event';
  }

  get exchange() {
    return 'test-exchange';
  }

  get queueName() {
    return 'test-queue';
  }

  async handler(event) {
    this.calls.push(['handler', event]);
  }
}

test('initializes the domain event consumer with metadata and middleware chain', async () => {
  const calls = [];
  const event = new TestDomainEvent('aggregate-id');
  const rawMessage = { id: 'raw-message' };
  const kernel = new Kernel();
  const domainEventConsumer = {
    consume: async (queueName, eventName, EventClass, exchange, handler) => {
      calls.push([queueName, eventName, EventClass, exchange]);
      await handler(event, {
        metadata: {
          rawMessage,
          retries: 1,
        },
      });
    },
  };
  const consumer = new TestConsumer(domainEventConsumer, calls);

  Kernel.consumerMiddleware.length = 0;
  kernel.registerConsumerMiddleware({
    async handle(receivedEvent, next, context) {
      calls.push(['middleware:before', receivedEvent]);
      calls.push([
        'context',
        context.eventId,
        context.queueName,
        context.metadata.retries,
        context.rawMessage,
      ]);
      await next();
      calls.push(['middleware:after', receivedEvent]);
    },
  });

  await consumer.init();

  assert.deepEqual(calls, [
    ['test-queue', 'test.domain-event', TestDomainEvent, 'test-exchange'],
    ['middleware:before', event],
    ['context', event.eventId, 'test-queue', 1, rawMessage],
    ['handler', event],
    ['middleware:after', event],
  ]);
});

test('resolves legacy services through the active kernel container', () => {
  class Service {}

  const service = new Service();
  new Kernel({
    di: {
      getService(requestedService) {
        assert.equal(requestedService, Service);

        return service;
      },
    },
  });

  const consumer = new TestConsumer({ consume: async () => {} }, []);

  assert.equal(consumer.get(Service), service);
});

test('provides correlation, idempotency and retry middleware', async () => {
  const calls = [];
  const event = new TestDomainEvent('aggregate-id');
  const kernel = new Kernel();
  const store = new InMemoryIdempotencyStore();
  let attempts = 0;
  const domainEventConsumer = {
    consume: async (queueName, eventName, EventClass, exchange, handler) => {
      void queueName;
      void eventName;
      void EventClass;
      void exchange;
      await handler(event);
      await handler(event);
    },
  };
  const consumer = new TestConsumer(domainEventConsumer, calls);

  Kernel.consumerMiddleware.length = 0;
  kernel.registerConsumerMiddleware(
    new CorrelationConsumerMiddleware({
      causationId: () => 'causation-id',
      correlationId: () => 'correlation-id',
    }),
    new IdempotencyConsumerMiddleware({ store }),
    new RetryConsumerMiddleware({
      maxAttempts: 2,
      onRetry: (error, attempt, context) => {
        calls.push(['retry', String(error), attempt, context.eventName]);
      },
    }),
    {
      async handle(receivedEvent, next) {
        attempts++;

        if (attempts === 1) {
          throw new Error('transient');
        }

        await next();
        calls.push([
          'ids',
          receivedEvent.getCorrelationId(),
          receivedEvent.getCausationId(),
        ]);
      },
    },
  );

  await consumer.init();

  assert.deepEqual(calls, [
    ['retry', 'Error: transient', 1, 'test.domain-event'],
    ['handler', event],
    ['ids', 'correlation-id', 'causation-id'],
  ]);
  assert.equal(attempts, 2);
});

test('supports middleware defaults and retry predicates', async () => {
  const event = new TestDomainEvent('aggregate-id');
  const context = {
    causationId: 'context-causation-id',
    correlationId: 'context-correlation-id',
    eventId: 'event-id',
    eventName: 'test.domain-event',
    exchange: 'exchange',
    kernel: new Kernel(),
    metadata: {},
    queueName: 'queue',
  };
  const calls = [];
  const store = new InMemoryIdempotencyStore();

  await new CorrelationConsumerMiddleware().handle(
    event,
    async () => calls.push(['correlation']),
    context,
  );
  await new IdempotencyConsumerMiddleware({
    key: () => 'custom-key',
    store,
  }).handle(event, async () => calls.push(['idempotency']), context);

  await assert.rejects(
    () =>
      new RetryConsumerMiddleware({
        delay: () => 1,
        maxAttempts: 2,
        shouldRetry: () => false,
      }).handle(
        event,
        async () => {
          throw new Error('permanent');
        },
        context,
      ),
    /permanent/,
  );

  assert.equal(event.getCorrelationId(), 'context-correlation-id');
  assert.equal(event.getCausationId(), 'context-causation-id');
  assert.equal(await store.has('custom-key'), true);
  assert.deepEqual(calls, [['correlation'], ['idempotency']]);
});

test('releases claimed idempotency keys when handlers fail', async () => {
  const event = new TestDomainEvent('aggregate-id');
  const context = {
    eventId: 'event-id',
    eventName: 'test.domain-event',
    exchange: 'exchange',
    kernel: new Kernel(),
    metadata: {},
    queueName: 'queue',
  };
  const store = new InMemoryIdempotencyStore();
  const middleware = new IdempotencyConsumerMiddleware({ store });

  await assert.rejects(
    () =>
      middleware.handle(
        event,
        async () => {
          throw new Error('failed');
        },
        context,
      ),
    /failed/,
  );
  await middleware.handle(event, async () => {}, context);

  assert.equal(await store.has('event-id'), true);
});

test('supports legacy idempotency stores without atomic claim', async () => {
  const event = new TestDomainEvent('aggregate-id');
  const context = {
    eventId: 'event-id',
    eventName: 'test.domain-event',
    exchange: 'exchange',
    kernel: new Kernel(),
    metadata: {},
    queueName: 'queue',
  };
  const handledKeys = new Set();
  const calls = [];
  const middleware = new IdempotencyConsumerMiddleware({
    store: {
      has: (key) => handledKeys.has(key),
      mark: (key) => handledKeys.add(key),
    },
  });

  await middleware.handle(event, async () => calls.push('first'), context);
  await middleware.handle(event, async () => calls.push('second'), context);

  assert.deepEqual(calls, ['first']);
});

test('allows retry middleware with zero attempts', async () => {
  const event = new TestDomainEvent('aggregate-id');
  const context = {
    eventId: event.eventId,
    eventName: 'test.domain-event',
    exchange: 'exchange',
    kernel: new Kernel(),
    metadata: {},
    queueName: 'queue',
  };
  let calls = 0;

  await new RetryConsumerMiddleware({ maxAttempts: 0 }).handle(
    event,
    async () => {
      calls++;
    },
    context,
  );

  assert.equal(calls, 0);
});

test('executes consumer middleware pipeline without middleware', async () => {
  const event = new TestDomainEvent('aggregate-id');
  const calls = [];
  const pipeline = new ConsumerMiddlewarePipeline([]);

  await pipeline.execute(
    event,
    {
      eventId: event.eventId,
      eventName: 'test.domain-event',
      exchange: 'exchange',
      kernel: new Kernel(),
      metadata: {},
      queueName: 'queue',
    },
    async () => calls.push(['handler', event]),
  );

  assert.deepEqual(calls, [['handler', event]]);
});

test('waits between retry attempts when delay is configured', async () => {
  const event = new TestDomainEvent('aggregate-id');
  const context = {
    eventId: event.eventId,
    eventName: 'test.domain-event',
    exchange: 'exchange',
    kernel: new Kernel(),
    metadata: {},
    queueName: 'queue',
  };
  let attempts = 0;

  await new RetryConsumerMiddleware({
    delay: 1,
    maxAttempts: 2,
  }).handle(
    event,
    async () => {
      attempts++;

      if (attempts === 1) {
        throw new Error('transient');
      }
    },
    context,
  );

  assert.equal(attempts, 2);
});

test('resolves retry delay from a function', async () => {
  const event = new TestDomainEvent('aggregate-id');
  const context = {
    eventId: event.eventId,
    eventName: 'test.domain-event',
    exchange: 'exchange',
    kernel: new Kernel(),
    metadata: {},
    queueName: 'queue',
  };
  const delays = [];
  let attempts = 0;

  await new RetryConsumerMiddleware({
    delay: (attempt, error, receivedContext) => {
      delays.push([attempt, String(error), receivedContext.eventName]);

      return 1;
    },
    maxAttempts: 2,
  }).handle(
    event,
    async () => {
      attempts++;

      if (attempts === 1) {
        throw new Error('transient');
      }
    },
    context,
  );

  assert.equal(attempts, 2);
  assert.deepEqual(delays, [[1, 'Error: transient', 'test.domain-event']]);
});
