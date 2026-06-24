import assert from 'node:assert/strict';
import test from 'node:test';

import { ExpressKernelServer } from '../../../../dist/adapters/ui/express/index.js';

test('throws when app or server are requested before running', () => {
  const server = new ExpressKernelServer({
    kernel: { getRoutes: () => [] },
    port: 0,
  });

  assert.throws(() => server.app, /HTTP server is not running/);
  assert.throws(() => server.server, /HTTP server is not running/);
});

test('runs, exposes app and server, then closes', async () => {
  const middlewareCalls = [];
  const server = new ExpressKernelServer({
    errorHandlers: [
      (error, request, response, next) => {
        void error;
        void request;
        void response;
        next();
      },
    ],
    kernel: { getRoutes: () => [] },
    middlewares: [
      (request, response, next) => {
        void request;
        void response;
        middlewareCalls.push('middleware');
        next();
      },
    ],
    port: 0,
    routePrefix: '/api',
  });

  await server.close();
  await server.run();

  assert.ok(server.app);
  assert.ok(server.server.listening);

  await server.close();

  assert.throws(() => server.app, /HTTP server is not running/);
});

test('default error handler returns JSON 500 responses', () => {
  const server = new ExpressKernelServer({
    kernel: { getRoutes: () => [] },
    port: 0,
  });
  const responses = [];
  const response = {
    json: (body) => responses.push(['json', body]),
    status: (statusCode) => {
      responses.push(['status', statusCode]);

      return response;
    },
  };

  server.defaultErrorHandler()(new Error('failed'), {}, response);
  server.defaultErrorHandler()('failed', {}, response);

  assert.deepEqual(responses, [
    ['status', 500],
    ['json', { error: 'failed' }],
    ['status', 500],
    ['json', { error: 'failed' }],
  ]);
});

test('rejects when closing a running server fails', async () => {
  const error = new Error('close failed');
  const server = new ExpressKernelServer({
    kernel: { getRoutes: () => [] },
    port: 0,
  });

  server.serverInstance = {
    close: (callback) => callback(error),
  };

  await assert.rejects(() => server.close(), error);
});

test('registers default error handlers and runs without optional middleware', async () => {
  const app = {
    handlers: [],
    use(handler) {
      this.handlers.push(handler);
    },
  };
  const server = new ExpressKernelServer({
    kernel: { getRoutes: () => [] },
  });

  server.registerErrorHandlers(app);

  assert.equal(app.handlers.length, 1);

  await server.run();
  await server.close();
});
