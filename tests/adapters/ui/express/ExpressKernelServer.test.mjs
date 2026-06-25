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

test('runs configurable controller, swagger and static hooks', async () => {
  class ExternalController {}

  const calls = [];
  const middleware = (name) => (request, response, next) => {
    void request;
    void response;
    calls.push(name);
    next();
  };
  const server = new ExpressKernelServer({
    afterControllersHooks: [(app) => calls.push(['after', Boolean(app)])],
    beforeControllersHooks: [(app) => calls.push(['before', Boolean(app)])],
    controllers: [ExternalController],
    hooks: [
      {
        handle: (app) => calls.push(['phase:before', Boolean(app)]),
        phase: 'beforeControllers',
      },
      {
        handle: (app) => calls.push(['phase:after', Boolean(app)]),
        phase: 'afterControllers',
      },
      {
        handle: (app) => calls.push(['phase:errors', Boolean(app)]),
        phase: 'beforeErrors',
      },
    ],
    kernel: { getRoutes: () => [] },
    middlewares: [middleware('base')],
    port: 0,
    postControllerMiddlewares: [middleware('post')],
    preControllerMiddlewares: [middleware('pre')],
    staticHooks: [(app) => calls.push(['static', Boolean(app)])],
    swaggerHooks: [(app) => calls.push(['swagger', Boolean(app)])],
  });

  await server.run();
  await server.close();

  assert.deepEqual(calls, [
    ['before', true],
    ['phase:before', true],
    ['after', true],
    ['phase:after', true],
    ['swagger', true],
    ['static', true],
    ['phase:errors', true],
  ]);
});

test('rejects duplicate run calls while server is running', async () => {
  const server = new ExpressKernelServer({
    kernel: { getRoutes: () => [] },
    port: 0,
  });

  await server.run();

  await assert.rejects(() => server.run(), /HTTP server is already running/);
  await server.close();
});
