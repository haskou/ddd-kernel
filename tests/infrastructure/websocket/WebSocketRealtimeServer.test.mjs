import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';

import { WebSocketRealtimeServer } from '../../../dist/infrastructure/websocket/index.js';

class FakeSocket {
  constructor() {
    this.destroyed = false;
    this.writes = [];
  }

  destroy() {
    this.destroyed = true;
  }

  write(message) {
    this.writes.push(message);
  }
}

test('attaches an upgrade listener and ignores different websocket paths', () => {
  const httpServer = new EventEmitter();
  const eventHub = { register: () => assert.fail('should not register') };
  const server = new WebSocketRealtimeServer({
    authenticator: {
      authenticate: () => assert.fail('should not authenticate'),
    },
    eventHub,
    websocketPath: '/events',
  });
  const socket = new FakeSocket();

  server.attach(httpServer);
  httpServer.emit('upgrade', { url: '/other' }, socket, Buffer.alloc(0));
  httpServer.emit('upgrade', {}, socket, Buffer.alloc(0));

  assert.equal(socket.destroyed, false);
  assert.deepEqual(socket.writes, []);
});

test('rejects unauthorized websocket upgrades', () => {
  const httpServer = new EventEmitter();
  const server = new WebSocketRealtimeServer({
    authenticator: {
      authenticate: () => {
        throw new Error('unauthorized');
      },
    },
    eventHub: { register: () => assert.fail('should not register') },
  });
  const socket = new FakeSocket();

  server.attach(httpServer);
  httpServer.emit('upgrade', { url: '/ws' }, socket, Buffer.alloc(0));

  assert.equal(socket.destroyed, true);
  assert.deepEqual(socket.writes, ['HTTP/1.1 401 Unauthorized\r\n\r\n']);
});

test('registers authenticated websocket upgrades', () => {
  const httpServer = new EventEmitter();
  const registered = [];
  const client = {};
  const request = { url: '/ws' };
  const server = new WebSocketRealtimeServer({
    authenticator: {
      authenticate: (receivedRequest, websocketPath) => {
        assert.equal(receivedRequest, request);
        assert.equal(websocketPath, '/ws');

        return 'user-id';
      },
    },
    eventHub: {
      register: (identity, receivedClient) =>
        registered.push([identity, receivedClient]),
    },
  });

  server.server.handleUpgrade = (receivedRequest, socket, head, callback) => {
    assert.equal(receivedRequest, request);
    assert.ok(socket);
    assert.ok(Buffer.isBuffer(head));
    callback(client);
  };

  server.attach(httpServer);
  httpServer.emit('upgrade', request, new FakeSocket(), Buffer.alloc(0));

  assert.deepEqual(registered, [['user-id', client]]);
});
