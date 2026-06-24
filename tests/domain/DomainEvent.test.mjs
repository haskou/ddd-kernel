import assert from 'node:assert/strict';
import test from 'node:test';

import { TestDomainEvent } from '../helpers/TestDomainEvent.mjs';

test('serializes domain event metadata and attributes', () => {
  const occurredOn = new Date('2026-06-24T10:00:00.000Z');
  const event = new TestDomainEvent(
    'aggregate-id',
    { name: 'Ada' },
    'event-id',
    occurredOn,
    'correlation-id',
    'causation-id',
  );

  assert.deepEqual(JSON.parse(event.decode()), {
    aggregate_id: 'aggregate-id',
    attributes: { name: 'Ada' },
    causation_id: 'causation-id',
    correlation_id: 'correlation-id',
    event_id: 'event-id',
    occurred_on: occurredOn.getTime(),
    type: 'test.domain-event',
  });
  assert.deepEqual(event.encode('{"ok":true}'), { ok: true });
});

test('uses event id as default correlation and causation ids', () => {
  const event = new TestDomainEvent('aggregate-id', {}, 'event-id');

  assert.equal(event.getCorrelationId(), 'event-id');
  assert.equal(event.getCausationId(), 'event-id');
  assert.equal(event.withCorrelationId('next-correlation'), event);
  assert.equal(event.withCausationId('next-causation'), event);
  assert.equal(event.getCorrelationId(), 'next-correlation');
  assert.equal(event.getCausationId(), 'next-causation');
});
