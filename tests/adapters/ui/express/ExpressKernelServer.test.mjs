import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ExpressControllerResolver,
  ExpressKernelServer,
  HttpErrorHandler,
} from '../../../../dist/adapters/ui/express/index.js';
import { Kernel } from '../../../../dist/index.js';
import { DependencyInjection } from '../../../../dist/infrastructure/dependency-injection/index.js';
import { Get, JsonController } from 'routing-controllers';

const getServerPort = (server) => {
  const address = server.server.address();

  assert.notEqual(address, null);
  assert.equal(typeof address, 'object');

  return address.port;
};

class ServiceNotFoundException extends Error {}

const createKernelWithServiceResolver = ({ getService, hasService }) => ({
  di: {
    getService,
    hasService: hasService ?? (() => false),
  },
  getRoutes: () => [],
});

const decorateGetController = (Controller, route, methodName) => {
  JsonController(route)(Controller);
  Get('/')(Controller.prototype, methodName);
};

test('resolves known controllers locally when they are not registered in DI', () => {
  class ExternalController {}

  const calls = [];
  const kernel = createKernelWithServiceResolver({
    getService: (ClassDefinition) => {
      calls.push(['getService', ClassDefinition.name]);

      throw new ServiceNotFoundException(
        `The service ${ClassDefinition.name} is not registered`,
      );
    },
    hasService: (ClassDefinition) => {
      calls.push(['hasService', ClassDefinition.name]);

      return false;
    },
  });
  const resolver = new ExpressControllerResolver(kernel, [ExternalController]);

  const firstInstance = resolver.get(ExternalController);
  const secondInstance = resolver.get(ExternalController);

  assert.ok(firstInstance instanceof ExternalController);
  assert.equal(firstInstance, secondInstance);
  assert.deepEqual(calls, [
    ['hasService', 'ExternalController'],
    ['hasService', 'ExternalController'],
  ]);
});

test('resolves registered controllers through DI', () => {
  class RegisteredController {}

  const controller = new RegisteredController();
  const calls = [];
  const kernel = createKernelWithServiceResolver({
    getService: (ClassDefinition) => {
      calls.push(['getService', ClassDefinition.name]);

      return controller;
    },
    hasService: (ClassDefinition) => {
      calls.push(['hasService', ClassDefinition.name]);

      return true;
    },
  });
  const resolver = new ExpressControllerResolver(kernel, [
    RegisteredController,
  ]);

  assert.equal(resolver.get(RegisteredController), controller);
  assert.deepEqual(calls, [
    ['hasService', 'RegisteredController'],
    ['getService', 'RegisteredController'],
  ]);
});

test('does not write container warnings for known external controllers missing from DI', () => {
  class ExternalController {}

  const warnings = [];
  const dependencyInjection = new DependencyInjection();

  dependencyInjection.container.logger = {
    debug() {},
    info() {},
    warn: (message) => warnings.push(message),
  };

  const kernel = {
    di: dependencyInjection,
    getRoutes: () => [],
  };
  const resolver = new ExpressControllerResolver(kernel, [ExternalController]);

  const instance = resolver.get(ExternalController);

  assert.ok(instance instanceof ExternalController);
  assert.deepEqual(warnings, []);
});

test('rethrows missing services that are not known controllers', () => {
  class MissingService {}

  const error = new ServiceNotFoundException(
    'The service MissingService is not registered',
  );
  const kernel = createKernelWithServiceResolver({
    getService: () => {
      throw error;
    },
  });
  const resolver = new ExpressControllerResolver(kernel, []);

  assert.throws(() => resolver.get(MissingService), error);
});

test('rethrows dependency resolution errors for known controllers', () => {
  class ExternalController {}

  const error = new ServiceNotFoundException(
    'The service ControllerDependency is not registered',
  );
  const kernel = createKernelWithServiceResolver({
    getService: () => {
      throw error;
    },
    hasService: () => true,
  });
  const resolver = new ExpressControllerResolver(kernel, [ExternalController]);

  assert.throws(() => resolver.get(ExternalController), error);
});

test('runs external routing-controllers without requiring DI registration', async () => {
  class ExternalHttpController {
    index() {
      return { ok: true };
    }
  }

  decorateGetController(ExternalHttpController, '/external-http', 'index');

  const calls = [];
  const warnings = [];
  const kernel = createKernelWithServiceResolver({
    getService: (ClassDefinition) => {
      calls.push(['getService', ClassDefinition.name]);
      warnings.push(`The service ${ClassDefinition.name} is not registered`);

      throw new ServiceNotFoundException(
        `The service ${ClassDefinition.name} is not registered`,
      );
    },
    hasService: (ClassDefinition) => {
      calls.push(['hasService', ClassDefinition.name]);

      return false;
    },
  });
  const server = new ExpressKernelServer({
    controllers: [ExternalHttpController],
    kernel,
    port: 0,
  });

  await server.run();

  try {
    const response = await fetch(
      `http://127.0.0.1:${getServerPort(server)}/external-http`,
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.deepEqual(calls, [['hasService', 'ExternalHttpController']]);
    assert.deepEqual(warnings, []);
  } finally {
    await server.close();
  }
});

test('runs kernel registered routes without requiring DI registration', async () => {
  class KernelRouteController {
    index() {
      return { ok: true };
    }
  }

  decorateGetController(KernelRouteController, '/kernel-route', 'index');

  const calls = [];
  const warnings = [];
  const kernel = new Kernel({
    di: {
      compile: async () => {},
      getService: (ClassDefinition) => {
        calls.push(['getService', ClassDefinition.name]);
        warnings.push(`The service ${ClassDefinition.name} is not registered`);

        throw new ServiceNotFoundException(
          `The service ${ClassDefinition.name} is not registered`,
        );
      },
      hasService: (ClassDefinition) => {
        calls.push(['hasService', ClassDefinition.name]);

        return false;
      },
    },
  });

  await kernel.dependencyInjection();
  kernel.registerRoutes(KernelRouteController);

  const server = new ExpressKernelServer({
    kernel,
    port: 0,
  });

  await server.run();

  try {
    const response = await fetch(
      `http://127.0.0.1:${getServerPort(server)}/kernel-route`,
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.deepEqual(calls, [['hasService', 'KernelRouteController']]);
    assert.deepEqual(warnings, []);
  } finally {
    await server.close();
  }
});

test('does not fallback to plain construction for registered controller dependency errors', async () => {
  class RegisteredHttpController {
    index() {
      return { ok: true };
    }
  }

  decorateGetController(RegisteredHttpController, '/registered-http', 'index');

  const kernel = createKernelWithServiceResolver({
    getService: () => {
      throw new ServiceNotFoundException(
        'The service ControllerDependency is not registered',
      );
    },
    hasService: () => true,
  });
  const server = new ExpressKernelServer({
    controllers: [RegisteredHttpController],
    kernel,
    port: 0,
  });

  await server.run();

  try {
    const response = await fetch(
      `http://127.0.0.1:${getServerPort(server)}/registered-http`,
    );

    assert.equal(response.status, 500);
    const body = await response.json();

    assert.equal(
      body.message,
      'The service ControllerDependency is not registered',
    );
    assert.equal(body.name, 'ServiceNotFoundException');
  } finally {
    await server.close();
  }
});

test('registers middleware, hooks and error handlers before running', async () => {
  const calls = [];
  const kernel = new Kernel();
  const server = new ExpressKernelServer({
    kernel,
    middlewares: [
      (request, response, next) => {
        void request;
        void response;
        calls.push('options:middleware');
        next();
      },
    ],
    port: 0,
  });

  server
    .registerMiddlewares((request, response, next) => {
      void request;
      void response;
      calls.push('registered:middleware');
      next();
    })
    .registerHooks({
      handle: (app) => {
        app.get('/boom', (request, response, next) => {
          void request;
          void response;
          calls.push('hook:route');
          next(new Error('boom'));
        });
      },
      phase: 'beforeControllers',
    })
    .registerErrorHandlers((error, request, response, next) => {
      void request;
      void next;
      calls.push('registered:error');
      response.status(409).json({
        message: error instanceof Error ? error.message : String(error),
      });
    });

  await server.run();

  try {
    const response = await fetch(
      `http://127.0.0.1:${getServerPort(server)}/boom`,
    );
    const body = await response.json();

    assert.equal(response.status, 409);
    assert.deepEqual(body, { message: 'boom' });
    assert.deepEqual(calls, [
      'options:middleware',
      'registered:middleware',
      'hook:route',
      'registered:error',
    ]);
  } finally {
    await server.close();
  }
});

test('runs the full HTTP extension pipeline in registration order', async () => {
  const calls = [];
  const kernel = new Kernel();
  const server = new ExpressKernelServer({
    afterControllersHooks: [
      (app) => {
        app.use((request, response, next) => {
          void request;
          void response;
          calls.push('options:after-controller-hook');
          next();
        });
      },
    ],
    beforeControllersHooks: [
      (app) => {
        app.use((request, response, next) => {
          void request;
          void response;
          calls.push('options:before-controller-hook');
          next();
        });
      },
    ],
    hooks: [
      {
        handle: (app) => {
          app.use((request, response, next) => {
            void request;
            void response;
            calls.push('options:before-controller-phase');
            next();
          });
        },
        phase: 'beforeControllers',
      },
      {
        handle: (app) => {
          app.use((request, response, next) => {
            void request;
            void response;
            calls.push('options:after-controller-phase');
            next();
          });
        },
        phase: 'afterControllers',
      },
    ],
    kernel,
    postControllerMiddlewares: [
      (request, response, next) => {
        void request;
        void response;
        calls.push('options:post-controller-middleware');
        next();
      },
    ],
    preControllerMiddlewares: [
      (request, response, next) => {
        void request;
        void response;
        calls.push('options:pre-controller-middleware');
        next();
      },
    ],
    staticHooks: [
      (app) => {
        app.use((request, response, next) => {
          void request;
          void response;
          calls.push('options:static-hook');
          next();
        });
      },
    ],
    swaggerHooks: [
      (app) => {
        app.use((request, response, next) => {
          void request;
          void response;
          calls.push('options:swagger-hook');
          next();
        });
      },
    ],
  });

  server
    .registerControllers(class ExternalController {})
    .registerPreControllerMiddlewares((request, response, next) => {
      void request;
      void response;
      calls.push('registered:pre-controller-middleware');
      next();
    })
    .registerBeforeControllersHooks((app) => {
      app.use((request, response, next) => {
        void request;
        void response;
        calls.push('registered:before-controller-hook');
        next();
      });
    })
    .registerHooks(
      {
        handle: (app) => {
          app.use((request, response, next) => {
            void request;
            void response;
            calls.push('registered:before-controller-phase');
            next();
          });
        },
        phase: 'beforeControllers',
      },
      {
        handle: (app) => {
          app.use((request, response, next) => {
            void request;
            void response;
            calls.push('registered:after-controller-phase');
            next();
          });
        },
        phase: 'afterControllers',
      },
      {
        handle: (app) => {
          app.get('/order', (request, response) => {
            void request;
            calls.push('registered:before-errors-phase');
            response.status(200).json({ ok: true });
          });
        },
        phase: 'beforeErrors',
      },
    )
    .registerPostControllerMiddlewares((request, response, next) => {
      void request;
      void response;
      calls.push('registered:post-controller-middleware');
      next();
    })
    .registerAfterControllersHooks((app) => {
      app.use((request, response, next) => {
        void request;
        void response;
        calls.push('registered:after-controller-hook');
        next();
      });
    });

  await server.run();

  try {
    const response = await fetch(
      `http://127.0.0.1:${getServerPort(server)}/order`,
    );

    assert.equal(response.status, 200);
    assert.deepEqual(calls, [
      'options:pre-controller-middleware',
      'registered:pre-controller-middleware',
      'options:before-controller-hook',
      'registered:before-controller-hook',
      'options:before-controller-phase',
      'registered:before-controller-phase',
      'options:post-controller-middleware',
      'registered:post-controller-middleware',
      'options:after-controller-hook',
      'registered:after-controller-hook',
      'options:after-controller-phase',
      'registered:after-controller-phase',
      'options:swagger-hook',
      'options:static-hook',
      'registered:before-errors-phase',
    ]);
  } finally {
    await server.close();
  }
});

test('forwards routing-controllers options to the HTTP runtime', async () => {
  const server = new ExpressKernelServer({
    hooks: [
      {
        handle: (app) => {
          app.get('/cors', (request, response) => {
            void request;
            response.status(200).json({ ok: true });
          });
        },
        phase: 'beforeErrors',
      },
    ],
    kernel: new Kernel(),
    port: 0,
    routingControllersOptions: {
      cors: true,
      defaultErrorHandler: false,
    },
  });

  await server.run();

  try {
    const response = await fetch(
      `http://127.0.0.1:${getServerPort(server)}/cors`,
      {
        headers: { Origin: 'https://example.test' },
      },
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
  } finally {
    await server.close();
  }
});

test('uses the default HTTP error handler when none is registered', async () => {
  const server = new ExpressKernelServer({
    hooks: [
      {
        handle: (app) => {
          app.get('/default-error', (request, response, next) => {
            void request;
            void response;
            next('plain failure');
          });
        },
        phase: 'beforeControllers',
      },
    ],
    kernel: new Kernel(),
    port: 0,
  });

  await server.run();

  try {
    const response = await fetch(
      `http://127.0.0.1:${getServerPort(server)}/default-error`,
    );
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.deepEqual(body, { error: 'plain failure' });
  } finally {
    await server.close();
  }
});

test('formats Error instances with the default HTTP error handler', async () => {
  const server = new ExpressKernelServer({
    hooks: [
      {
        handle: (app) => {
          app.get('/default-error-instance', (request, response, next) => {
            void request;
            void response;
            next(new Error('typed failure'));
          });
        },
        phase: 'beforeControllers',
      },
    ],
    kernel: new Kernel(),
    port: 0,
  });

  await server.run();

  try {
    const response = await fetch(
      `http://127.0.0.1:${getServerPort(server)}/default-error-instance`,
    );
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.deepEqual(body, { error: 'typed failure' });
  } finally {
    await server.close();
  }
});

test('handles common HTTP errors with the shared HTTP error handler', async () => {
  const server = new ExpressKernelServer({
    hooks: [
      {
        handle: (app) => {
          app.get('/syntax', (request, response, next) => {
            void request;
            void response;
            next(new SyntaxError('broken'));
          });
          app.get('/payload', (request, response, next) => {
            void request;
            void response;
            const error = new Error('too large');
            error.type = 'entity.too.large';
            next(error);
          });
          app.get('/http', (request, response, next) => {
            void request;
            void response;
            const error = new Error('invalid');
            error.name = 'BadRequestError';
            error.httpCode = 400;
            error.errors = [
              {
                children: [
                  {
                    constraints: { isString: 'name must be a string' },
                    property: 'name',
                    value: 123,
                  },
                ],
                property: 'body',
              },
            ];
            next(error);
          });
        },
        phase: 'beforeControllers',
      },
    ],
    kernel: new Kernel(),
    port: 0,
  });

  server.registerErrorHandlers(new HttpErrorHandler().handle);

  await server.run();

  try {
    const syntaxResponse = await fetch(
      `http://127.0.0.1:${getServerPort(server)}/syntax`,
    );
    const payloadResponse = await fetch(
      `http://127.0.0.1:${getServerPort(server)}/payload`,
    );
    const httpResponse = await fetch(
      `http://127.0.0.1:${getServerPort(server)}/http`,
    );

    assert.equal(syntaxResponse.status, 400);
    assert.deepEqual(await syntaxResponse.json(), {
      code: 'SyntaxError',
      message: 'Malformed JSON',
    });
    assert.equal(payloadResponse.status, 413);
    assert.deepEqual(await payloadResponse.json(), {
      code: 'PayloadTooLargeError',
      httpStatus: 413,
      message: 'Request entity too large.',
    });
    assert.equal(httpResponse.status, 400);
    assert.deepEqual(await httpResponse.json(), {
      code: 'BadRequestError',
      errors: [
        {
          details: { isString: 'name must be a string' },
          property: 'name',
          value: 123,
        },
      ],
      httpStatus: 400,
      message: 'invalid',
    });
  } finally {
    await server.close();
  }
});

test('logs unhandled HTTP errors in configured environments', async () => {
  const calls = [];
  const previousEnvironment = process.env.NODE_ENV;
  const server = new ExpressKernelServer({
    hooks: [
      {
        handle: (app) => {
          app.get('/unhandled', (request, response, next) => {
            void request;
            void response;
            next(new Error('unexpected'));
          });
        },
        phase: 'beforeControllers',
      },
    ],
    kernel: new Kernel(),
    port: 0,
  });

  process.env.NODE_ENV = 'test';
  server.registerErrorHandlers(
    new HttpErrorHandler({
      logger: {
        debug: (message) => calls.push(['debug', message]),
        error: (message) => calls.push(['error', message]),
        info: () => {},
        warn: () => {},
      },
    }).handle,
  );

  await server.run();

  try {
    const response = await fetch(
      `http://127.0.0.1:${getServerPort(server)}/unhandled`,
    );
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.deepEqual(body, {
      code: 'Error',
      message: 'unexpected',
    });
    assert.equal(calls[0][0], 'error');
    assert.equal(calls[0][1], 'Unhandled error: unexpected');
    assert.equal(calls[1][0], 'debug');
  } finally {
    await server.close();

    if (previousEnvironment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousEnvironment;
    }
  }
});

test('does not forward unhandled HTTP errors after sending fallback response', () => {
  const calls = [];
  const response = {
    json: (body) => {
      calls.push(['json', body]);

      return response;
    },
    status: (statusCode) => {
      calls.push(['status', statusCode]);

      return response;
    },
  };

  new HttpErrorHandler().handle(
    new Error('unexpected'),
    {},
    response,
    (error) => calls.push(['next', error]),
  );

  assert.deepEqual(calls, [
    ['status', 500],
    ['json', { code: 'Error', message: 'unexpected' }],
  ]);
});

test('runs custom HTTP error handlers before generic HTTP errors', async () => {
  const server = new ExpressKernelServer({
    hooks: [
      {
        handle: (app) => {
          app.get('/domain-error', (request, response, next) => {
            void request;
            void response;
            const error = new Error('already exists');
            error.name = 'DomainError';
            next(error);
          });
        },
        phase: 'beforeControllers',
      },
    ],
    kernel: new Kernel(),
    port: 0,
  });

  server.registerErrorHandlers(
    new HttpErrorHandler({
      handlers: [
        (error, response) => {
          if (error.name !== 'DomainError') {
            return false;
          }

          response.status(409).json({
            code: error.name,
            message: error.message,
          });

          return true;
        },
      ],
    }).handle,
  );

  await server.run();

  try {
    const response = await fetch(
      `http://127.0.0.1:${getServerPort(server)}/domain-error`,
    );

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      code: 'DomainError',
      message: 'already exists',
    });
  } finally {
    await server.close();
  }
});

test('guards server access and close lifecycle', async () => {
  const server = new ExpressKernelServer({
    kernel: new Kernel(),
    port: 0,
  });

  assert.throws(() => server.app, /HTTP server is not running/);
  assert.throws(() => server.server, /HTTP server is not running/);
  await server.close();
  await server.run();
  await assert.rejects(() => server.run(), /HTTP server is already running/);

  assert.equal(typeof server.app.use, 'function');

  const httpServer = server.server;
  const close = httpServer.close.bind(httpServer);

  httpServer.close = (callback) => {
    callback?.(new Error('close failed'));

    return httpServer;
  };

  await assert.rejects(() => server.close(), /close failed/);

  httpServer.close = close;
  await server.close();
  assert.throws(() => server.app, /HTTP server is not running/);
});

test('rejects HTTP pipeline registration after the server is running', async () => {
  const server = new ExpressKernelServer({
    kernel: new Kernel(),
    port: 0,
  });

  await server.run();

  try {
    assert.throws(
      () =>
        server.registerMiddlewares((request, response, next) => {
          void request;
          void response;
          next();
        }),
      /HTTP server is already running/,
    );
    assert.throws(
      () =>
        server.registerErrorHandlers((error, request, response, next) => {
          void error;
          void request;
          void response;
          next();
        }),
      /HTTP server is already running/,
    );
  } finally {
    await server.close();
  }
});
