import assert from 'node:assert/strict';
import test from 'node:test';

import { Consumer } from '../../../dist/adapters/pubsub/index.js';
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
  const kernel = new Kernel();
  const domainEventConsumer = {
    consume: async (queueName, eventName, EventClass, exchange, handler) => {
      calls.push([queueName, eventName, EventClass, exchange]);
      await handler(event);
    },
  };
  const consumer = new TestConsumer(domainEventConsumer, calls);

  Kernel.consumerMiddleware.length = 0;
  kernel.registerConsumerMiddleware({
    async handle(receivedEvent, next) {
      calls.push(['middleware:before', receivedEvent]);
      await next();
      calls.push(['middleware:after', receivedEvent]);
    },
  });

  await consumer.init();

  assert.deepEqual(calls, [
    ['test-queue', 'test.domain-event', TestDomainEvent, 'test-exchange'],
    ['middleware:before', event],
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
