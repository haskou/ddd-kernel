import assert from 'node:assert/strict';
import test from 'node:test';

import { AggregateRoot } from '../../dist/domain/index.js';
import { TestDomainEvent } from '../helpers/TestDomainEvent.mjs';

class TestAggregate extends AggregateRoot {
  addEvent(event) {
    this.record(event);
  }

  toPrimitives() {
    return {};
  }
}

test('pulls recorded domain events and clears the aggregate queue', () => {
  const aggregate = new TestAggregate();
  const event = new TestDomainEvent('aggregate-id');

  aggregate.addEvent(event);

  assert.deepEqual(aggregate.pullDomainEvents(), [event]);
  assert.deepEqual(aggregate.pullDomainEvents(), []);
});
