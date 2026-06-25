import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';

import { WebSocketEventHub } from '../../../dist/infrastructure/websocket/index.js';
import { TestDomainEvent } from '../../helpers/TestDomainEvent.mjs';

class FakeWebSocket extends EventEmitter {
  constructor() {
    super();
    this.OPEN = 1;
    this.readyState = 1;
    this.messages = [];
  }

  send(message) {
    this.messages.push(JSON.parse(message));
  }
}

test('registers clients, acknowledges connections and broadcasts to recipients', () => {
  const event = new TestDomainEvent(
    'aggregate-id',
    { name: 'Ada' },
    'event-id',
  );
  const client = new FakeWebSocket();
  const hub = new WebSocketEventHub({
    resolve: (receivedEvent) => {
      assert.equal(receivedEvent, event);

      return ['user-id'];
    },
  });

  hub.register('user-id', client);
  hub.broadcast(event);

  assert.deepEqual(client.messages, [
    { identityId: 'user-id', type: 'connection_ack' },
    {
      event: JSON.parse(event.decode()),
      type: 'domain_event',
    },
  ]);
});

test('broadcasts custom messages to every connected open client', () => {
  const firstClient = new FakeWebSocket();
  const secondClient = new FakeWebSocket();
  const closedClient = new FakeWebSocket();
  const hub = new WebSocketEventHub();

  closedClient.readyState = 3;
  hub.register('first', firstClient);
  hub.register('second', secondClient);
  hub.register('closed', closedClient);
  hub.broadcastToAll({ payload: true, type: 'custom' });

  assert.deepEqual(firstClient.messages.at(-1), {
    payload: true,
    type: 'custom',
  });
  assert.deepEqual(secondClient.messages.at(-1), {
    payload: true,
    type: 'custom',
  });
  assert.equal(closedClient.messages.length, 0);
});

test('logs offline recipients and unregisters closed clients', () => {
  const logs = [];
  const client = new FakeWebSocket();
  const hub = new WebSocketEventHub(undefined, {
    debug: (message) => logs.push(message),
    error: () => {},
    info: () => {},
    warn: () => {},
  });

  hub.sendToRecipient('missing', { type: 'custom' });
  hub.register('user-id', client);
  client.emit('close');
  client.emit('close');
  hub.sendToRecipient('user-id', { type: 'custom' });

  assert.deepEqual(logs, [
    'WebSocket recipient "missing" offline.',
    'WebSocket recipient "user-id" offline.',
  ]);
});

test('broadcasts no recipients when no resolver is configured', () => {
  const event = new TestDomainEvent('aggregate-id');
  const hub = new WebSocketEventHub();

  assert.doesNotThrow(() => hub.broadcast(event));
});
