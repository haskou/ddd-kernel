import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createKernel,
  Kernel,
  KernelEnvironmentValidationError,
} from '../dist/index.js';

class TestConsumer {
  constructor(calls) {
    this.calls = calls;
  }

  async init() {
    this.calls.push('consumer:init');
  }

  async close() {
    this.calls.push('consumer:close');
  }
}

class TestScheduler {
  constructor(calls) {
    this.calls = calls;
  }

  async init() {
    this.calls.push('scheduler:init');
  }

  async stop() {
    this.calls.push('scheduler:stop');
  }
}

test('keeps two kernel instances isolated', () => {
  const firstKernel = new Kernel();
  const secondKernel = new Kernel();

  firstKernel.registerConsumerInstances(new TestConsumer([]));
  secondKernel.registerSchedulerInstances(new TestScheduler([]));

  assert.equal(firstKernel.consumers.length, 1);
  assert.equal(firstKernel.schedulers.length, 0);
  assert.equal(secondKernel.consumers.length, 0);
  assert.equal(secondKernel.schedulers.length, 1);
});

test('runs shutdown hooks after consumers and schedulers', async () => {
  const calls = [];
  const kernel = new Kernel({
    logger: {
      debug() {},
      error() {},
      info() {},
      warn() {},
      async flush() {
        calls.push('logger:flush');
      },
    },
  });

  kernel.registerConsumerInstances(new TestConsumer(calls));
  kernel.registerSchedulerInstances(new TestScheduler(calls));
  kernel.registerShutdownHook(() => calls.push('hook'));

  await kernel.shutdown();

  assert.deepEqual(calls, [
    'consumer:close',
    'scheduler:stop',
    'hook',
    'logger:flush',
  ]);
});

test('can be imported from CommonJS output', () => {
  if (!existsSync(new URL('../dist/index.cjs', import.meta.url))) {
    return;
  }

  const require = createRequire(import.meta.url);
  const cjsPackage = require('../dist/index.cjs');

  assert.equal(typeof cjsPackage.Kernel, 'function');
});

test('resolves classes through DI registration methods and clears registrations', async () => {
  class ConsumerClass {}
  class SchedulerClass {}
  class InitializerClass {}
  class RuntimeClass {}

  const calls = [];
  const consumer = { init: async () => calls.push('consumer:init') };
  const scheduler = {
    init: async () => calls.push('scheduler:init'),
    runOnce: async () => calls.push('scheduler:runOnce'),
  };
  const initializer = { ensure: async () => calls.push('initializer:ensure') };
  const runtime = {
    close: async () => calls.push('runtime:close'),
    run: async () => calls.push('runtime:run'),
  };
  const services = new Map([
    [ConsumerClass, consumer],
    [SchedulerClass, scheduler],
    [InitializerClass, initializer],
    [RuntimeClass, runtime],
  ]);
  const kernel = new Kernel({
    di: {
      compile: async () => calls.push('di:compile'),
      getService: (ClassDefinition) => services.get(ClassDefinition),
    },
  });

  await kernel.dependencyInjection();
  kernel.registerConsumers(ConsumerClass);
  kernel.registerSchedulers(SchedulerClass);
  kernel.registerRoutes(ConsumerClass);
  await kernel.runConsumers();
  await kernel.runSchedulers();
  await kernel.runInitializers(InitializerClass);
  await kernel.runRuntimes(RuntimeClass);
  await kernel.runSchedulerNowAndSchedule(SchedulerClass);

  assert.equal(kernel.getRoutes().length, 1);
  assert.deepEqual(calls, [
    'di:compile',
    'consumer:init',
    'scheduler:init',
    'initializer:ensure',
    'runtime:run',
    'scheduler:runOnce',
    'scheduler:init',
  ]);

  await kernel.shutdown();

  assert.equal(calls.includes('runtime:close'), true);

  kernel.removeConsumers();
  kernel.removeSchedulers();
  kernel.removeRoutes();

  assert.equal(kernel.consumers.length, 0);
  assert.equal(kernel.schedulers.length, 0);
  assert.equal(kernel.routes.length, 0);
});

test('throws when DI is accessed before initialization', () => {
  const kernel = new Kernel();

  assert.throws(
    () => kernel.di,
    /Kernel dependency injection has not been initialized/,
  );
});

test('keeps the instance kernel active after dependency injection', async () => {
  const calls = [];
  const kernel = new Kernel({
    di: {
      compile: async () => {
        calls.push('compile');
        new Kernel();
      },
      getService: () => undefined,
    },
  });

  await kernel.dependencyInjection();

  assert.deepEqual(calls, ['compile']);
  assert.equal(Kernel.active, kernel);
  assert.equal(Kernel.di, kernel.di);
});

test('configures dependency injection from kernel options', async () => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'ddd-kernel-'));
  const sourceDirectory = path.join(temporaryDirectory, 'src');
  const servicesYamlPath = path.join(temporaryDirectory, 'services.yaml');
  const originalContainerBuild = process.env.CONTAINER_BUILD;

  process.env.CONTAINER_BUILD = 'true';
  await writeFile(path.join(sourceDirectory, 'Service.ts'), '', {
    flag: 'w',
  }).catch(async () => {
    await import('node:fs/promises').then(({ mkdir }) =>
      mkdir(sourceDirectory, { recursive: true }),
    );
    await writeFile(
      path.join(sourceDirectory, 'Service.ts'),
      'export default class Service {}\n',
    );
  });

  try {
    const kernel = new Kernel({ servicesYamlPath, sourceDirectory });

    await kernel.dependencyInjection();

    assert.ok(kernel.di);
  } finally {
    if (originalContainerBuild === undefined) {
      delete process.env.CONTAINER_BUILD;
    } else {
      process.env.CONTAINER_BUILD = originalContainerBuild;
    }
  }
});

test('allows dependency injection options to override container build environment', async () => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'ddd-kernel-'));
  const sourceDirectory = path.join(temporaryDirectory, 'src');
  const servicesYamlPath = path.join(temporaryDirectory, 'services.yaml');
  const originalContainerBuild = process.env.CONTAINER_BUILD;

  process.env.CONTAINER_BUILD = 'false';
  await import('node:fs/promises').then(({ mkdir }) =>
    mkdir(sourceDirectory, { recursive: true }),
  );
  await writeFile(
    path.join(sourceDirectory, 'Service.ts'),
    'export default class Service {}\n',
  );

  try {
    const kernel = new Kernel();

    await kernel.dependencyInjection({
      containerBuild: true,
      servicesYamlPath,
      sourceDirectory,
    });

    assert.equal(existsSync(servicesYamlPath), true);
  } finally {
    if (originalContainerBuild === undefined) {
      delete process.env.CONTAINER_BUILD;
    } else {
      process.env.CONTAINER_BUILD = originalContainerBuild;
    }
  }
});

test('falls back to CONTAINER_BUILD when dependency injection options omit containerBuild', async () => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'ddd-kernel-'));
  const sourceDirectory = path.join(temporaryDirectory, 'src');
  const servicesYamlPath = path.join(temporaryDirectory, 'services.yaml');
  const originalContainerBuild = process.env.CONTAINER_BUILD;

  process.env.CONTAINER_BUILD = 'true';
  await import('node:fs/promises').then(({ mkdir }) =>
    mkdir(sourceDirectory, { recursive: true }),
  );
  await writeFile(
    path.join(sourceDirectory, 'Service.ts'),
    'export default class Service {}\n',
  );

  try {
    const kernel = new Kernel();

    await kernel.dependencyInjection({
      servicesYamlPath,
      sourceDirectory,
    });

    assert.equal(existsSync(servicesYamlPath), true);
  } finally {
    if (originalContainerBuild === undefined) {
      delete process.env.CONTAINER_BUILD;
    } else {
      process.env.CONTAINER_BUILD = originalContainerBuild;
    }
  }
});

test('uses default dependency injection paths from current working directory', async (context) => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'ddd-kernel-'));
  const sourceDirectory = path.join(temporaryDirectory, 'src');
  const originalContainerBuild = process.env.CONTAINER_BUILD;
  const previousDirectory = process.cwd();

  await import('node:fs/promises').then(({ mkdir }) =>
    mkdir(sourceDirectory, { recursive: true }),
  );
  await writeFile(
    path.join(sourceDirectory, 'Service.ts'),
    'export default class Service {}\n',
  );
  process.env.CONTAINER_BUILD = 'true';
  process.chdir(temporaryDirectory);
  context.after(() => {
    process.chdir(previousDirectory);

    if (originalContainerBuild === undefined) {
      delete process.env.CONTAINER_BUILD;
    } else {
      process.env.CONTAINER_BUILD = originalContainerBuild;
    }
  });

  assert.equal(Kernel.configDirectory, path.join(temporaryDirectory, 'config'));
  assert.equal(Kernel.sourceDirectory, sourceDirectory);

  const kernel = new Kernel();

  await kernel.dependencyInjection();

  assert.ok(kernel.di);
});

test('supports shutdown candidates with shutdown, close, stop and flush methods', async () => {
  const calls = [];
  const kernel = new Kernel({
    logger: {
      debug: () => {},
      error: () => {},
      flush: () => calls.push('logger:flush'),
      info: () => {},
      warn: () => {},
    },
  });

  kernel.registerConsumerInstances(
    { shutdown: () => calls.push('consumer:shutdown') },
    { close: () => calls.push('consumer:close') },
  );
  kernel.registerSchedulerInstances(
    { stop: () => calls.push('scheduler:stop') },
    { flush: () => calls.push('scheduler:flush') },
  );

  await kernel.shutdown();

  assert.deepEqual(calls, [
    'consumer:close',
    'consumer:shutdown',
    'scheduler:flush',
    'scheduler:stop',
    'logger:flush',
  ]);
});

test('creates a default active kernel for static getters', () => {
  const state = globalThis[Symbol.for('@haskou/ddd-kernel/kernel-state')];
  const previousKernel = state.activeKernel;

  state.activeKernel = undefined;

  try {
    assert.deepEqual(Kernel.consumers, []);
    assert.deepEqual(Kernel.routes, []);
    assert.deepEqual(Kernel.schedulers, []);
    assert.equal(typeof Kernel.logger.info, 'function');
  } finally {
    state.activeKernel = previousKernel;
  }
});

test('creates kernels through the factory function', () => {
  assert.ok(createKernel() instanceof Kernel);
});

test('loads local environment variables by default', async (context) => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'ddd-kernel-'));
  const previousDirectory = process.cwd();
  const previousNodeEnvironment = process.env.NODE_ENV;
  const previousHttpPort = process.env.HTTP_PORT;

  delete process.env.NODE_ENV;
  delete process.env.HTTP_PORT;
  process.chdir(temporaryDirectory);
  context.after(() => {
    process.chdir(previousDirectory);

    if (previousNodeEnvironment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnvironment;
    }

    if (previousHttpPort === undefined) {
      delete process.env.HTTP_PORT;
    } else {
      process.env.HTTP_PORT = previousHttpPort;
    }
  });

  await writeFile(
    path.join(temporaryDirectory, '.env.local'),
    'HTTP_PORT=3001',
  );

  const kernel = new Kernel();
  const result = kernel.loadEnvironmentVariables();

  assert.equal(result.parsed.HTTP_PORT, '3001');
  assert.equal(kernel.environment.HTTP_PORT, '3001');
  assert.equal(Kernel.environment.HTTP_PORT, '3001');
});

test('loads environment variables from NODE_ENV by default', async (context) => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'ddd-kernel-'));
  const previousDirectory = process.cwd();
  const previousNodeEnvironment = process.env.NODE_ENV;
  const previousHttpPort = process.env.HTTP_PORT;

  process.env.NODE_ENV = 'ci';
  delete process.env.HTTP_PORT;
  process.chdir(temporaryDirectory);
  context.after(() => {
    process.chdir(previousDirectory);

    if (previousNodeEnvironment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnvironment;
    }

    if (previousHttpPort === undefined) {
      delete process.env.HTTP_PORT;
    } else {
      process.env.HTTP_PORT = previousHttpPort;
    }
  });

  await writeFile(path.join(temporaryDirectory, '.env.ci'), 'HTTP_PORT=3003');

  Kernel.loadEnvironmentVariables();

  assert.equal(Kernel.environment.HTTP_PORT, '3003');
});

test('loads named environment variables and supports override', async (context) => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'ddd-kernel-'));
  const previousDirectory = process.cwd();
  const previousHttpPort = process.env.HTTP_PORT;

  process.env.HTTP_PORT = '3000';
  process.chdir(temporaryDirectory);
  context.after(() => {
    process.chdir(previousDirectory);

    if (previousHttpPort === undefined) {
      delete process.env.HTTP_PORT;
    } else {
      process.env.HTTP_PORT = previousHttpPort;
    }
  });

  await writeFile(path.join(temporaryDirectory, '.env.test'), 'HTTP_PORT=3002');

  Kernel.loadEnvironmentVariables('test');
  assert.equal(process.env.HTTP_PORT, '3000');

  Kernel.loadEnvironmentVariables('test', { override: true });
  assert.equal(process.env.HTTP_PORT, '3002');
});

test('loads environment variables from an explicit path', async (context) => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'ddd-kernel-'));
  const previousCustomValue = process.env.CUSTOM_ENV_VALUE;
  const environmentPath = path.join(temporaryDirectory, 'custom.env');

  delete process.env.CUSTOM_ENV_VALUE;
  context.after(() => {
    if (previousCustomValue === undefined) {
      delete process.env.CUSTOM_ENV_VALUE;
    } else {
      process.env.CUSTOM_ENV_VALUE = previousCustomValue;
    }
  });

  await writeFile(environmentPath, 'CUSTOM_ENV_VALUE=loaded');

  Kernel.loadEnvironmentVariables('', { path: environmentPath });

  assert.equal(Kernel.environment.CUSTOM_ENV_VALUE, 'loaded');
});

test('loads base environment file when environment name is empty', async (context) => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'ddd-kernel-'));
  const previousDirectory = process.cwd();
  const previousCustomValue = process.env.CUSTOM_ENV_VALUE;

  delete process.env.CUSTOM_ENV_VALUE;
  process.chdir(temporaryDirectory);
  context.after(() => {
    process.chdir(previousDirectory);

    if (previousCustomValue === undefined) {
      delete process.env.CUSTOM_ENV_VALUE;
    } else {
      process.env.CUSTOM_ENV_VALUE = previousCustomValue;
    }
  });

  await writeFile(
    path.join(temporaryDirectory, '.env'),
    'CUSTOM_ENV_VALUE=base',
  );

  Kernel.loadEnvironmentVariables('');

  assert.equal(Kernel.environment.CUSTOM_ENV_VALUE, 'base');
});

test('validates typed environment schemas', async (context) => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'ddd-kernel-'));
  const previousDirectory = process.cwd();
  const previousHttpPort = process.env.HTTP_PORT;
  const previousEnableJobs = process.env.ENABLE_JOBS;
  const previousOptionalName = process.env.OPTIONAL_NAME;

  delete process.env.HTTP_PORT;
  delete process.env.ENABLE_JOBS;
  delete process.env.OPTIONAL_NAME;
  process.chdir(temporaryDirectory);
  context.after(() => {
    process.chdir(previousDirectory);

    if (previousHttpPort === undefined) {
      delete process.env.HTTP_PORT;
    } else {
      process.env.HTTP_PORT = previousHttpPort;
    }

    if (previousEnableJobs === undefined) {
      delete process.env.ENABLE_JOBS;
    } else {
      process.env.ENABLE_JOBS = previousEnableJobs;
    }

    if (previousOptionalName === undefined) {
      delete process.env.OPTIONAL_NAME;
    } else {
      process.env.OPTIONAL_NAME = previousOptionalName;
    }
  });

  await writeFile(
    path.join(temporaryDirectory, '.env.local'),
    ['HTTP_PORT=3004', 'ENABLE_JOBS=yes'].join('\n'),
  );

  const kernel = new Kernel({
    environmentSchema: {
      ENABLE_JOBS: { defaultValue: false, type: 'boolean' },
      HTTP_PORT: { required: true, type: 'number' },
      OPTIONAL_NAME: { type: 'string' },
    },
  });

  kernel.loadEnvironmentVariables();

  assert.equal(kernel.environment.HTTP_PORT, 3004);
  assert.equal(kernel.environment.ENABLE_JOBS, true);
  assert.equal(kernel.environment.OPTIONAL_NAME, undefined);
});

test('uses typed environment defaults when variables are absent', async (context) => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'ddd-kernel-'));
  const previousDirectory = process.cwd();
  const previousEnableJobs = process.env.ENABLE_JOBS;

  delete process.env.ENABLE_JOBS;
  process.chdir(temporaryDirectory);
  context.after(() => {
    process.chdir(previousDirectory);

    if (previousEnableJobs === undefined) {
      delete process.env.ENABLE_JOBS;
    } else {
      process.env.ENABLE_JOBS = previousEnableJobs;
    }
  });

  await writeFile(path.join(temporaryDirectory, '.env.local'), '');

  const kernel = new Kernel({
    environmentSchema: {
      ENABLE_JOBS: { defaultValue: false, type: 'boolean' },
    },
  });

  kernel.loadEnvironmentVariables();

  assert.equal(kernel.environment.ENABLE_JOBS, false);
});

test('throws when required typed environment variables are missing', () => {
  const previousHttpPort = process.env.HTTP_PORT;

  delete process.env.HTTP_PORT;

  try {
    const kernel = new Kernel({
      environmentSchema: {
        HTTP_PORT: { required: true, type: 'number' },
      },
    });

    assert.throws(
      () => kernel.loadEnvironmentVariables(),
      KernelEnvironmentValidationError,
    );
  } finally {
    if (previousHttpPort === undefined) {
      delete process.env.HTTP_PORT;
    } else {
      process.env.HTTP_PORT = previousHttpPort;
    }
  }
});

test('throws when typed environment variables cannot be parsed', () => {
  const previousHttpPort = process.env.HTTP_PORT;
  const previousEnableJobs = process.env.ENABLE_JOBS;

  process.env.HTTP_PORT = 'not-a-number';
  process.env.ENABLE_JOBS = 'maybe';

  try {
    const kernel = new Kernel({
      environmentSchema: {
        ENABLE_JOBS: { type: 'boolean' },
        HTTP_PORT: { type: 'number' },
      },
    });

    assert.throws(
      () => kernel.loadEnvironmentVariables(),
      /Environment variable "ENABLE_JOBS" has invalid boolean value "maybe"|Environment variable "HTTP_PORT" has invalid number value "not-a-number"/,
    );
  } finally {
    if (previousHttpPort === undefined) {
      delete process.env.HTTP_PORT;
    } else {
      process.env.HTTP_PORT = previousHttpPort;
    }

    if (previousEnableJobs === undefined) {
      delete process.env.ENABLE_JOBS;
    } else {
      process.env.ENABLE_JOBS = previousEnableJobs;
    }
  }
});

test('treats blank optional typed environment variables as absent', () => {
  const previousHttpPort = process.env.HTTP_PORT;

  process.env.HTTP_PORT = '';

  try {
    const kernel = new Kernel({
      environmentSchema: {
        HTTP_PORT: { type: 'number' },
      },
    });

    kernel.loadEnvironmentVariables();

    assert.equal(kernel.environment.HTTP_PORT, undefined);
  } finally {
    if (previousHttpPort === undefined) {
      delete process.env.HTTP_PORT;
    } else {
      process.env.HTTP_PORT = previousHttpPort;
    }
  }
});

test('uses defaults for blank optional typed environment variables', () => {
  const previousHttpPort = process.env.HTTP_PORT;

  process.env.HTTP_PORT = '';

  try {
    const kernel = new Kernel({
      environmentSchema: {
        HTTP_PORT: { defaultValue: 3000, type: 'number' },
      },
    });

    kernel.loadEnvironmentVariables();

    assert.equal(kernel.environment.HTTP_PORT, 3000);
  } finally {
    if (previousHttpPort === undefined) {
      delete process.env.HTTP_PORT;
    } else {
      process.env.HTTP_PORT = previousHttpPort;
    }
  }
});

test('throws when required typed environment variables are blank', () => {
  const previousHttpPort = process.env.HTTP_PORT;

  process.env.HTTP_PORT = '';

  try {
    const kernel = new Kernel({
      environmentSchema: {
        HTTP_PORT: { required: true, type: 'number' },
      },
    });

    assert.throws(
      () => kernel.loadEnvironmentVariables(),
      /Blank required environment variable "HTTP_PORT"/,
    );
  } finally {
    if (previousHttpPort === undefined) {
      delete process.env.HTTP_PORT;
    } else {
      process.env.HTTP_PORT = previousHttpPort;
    }
  }
});

test('throws when numeric typed environment variables are not finite numbers', () => {
  const previousHttpPort = process.env.HTTP_PORT;

  process.env.HTTP_PORT = 'not-a-number';

  try {
    const kernel = new Kernel({
      environmentSchema: {
        HTTP_PORT: { type: 'number' },
      },
    });

    assert.throws(
      () => kernel.loadEnvironmentVariables(),
      /Environment variable "HTTP_PORT" has invalid number value "not-a-number"/,
    );
  } finally {
    if (previousHttpPort === undefined) {
      delete process.env.HTTP_PORT;
    } else {
      process.env.HTTP_PORT = previousHttpPort;
    }
  }
});

test('keeps typed string environment variables as strings', () => {
  const previousApplicationName = process.env.APPLICATION_NAME;

  process.env.APPLICATION_NAME = 'ddd-kernel-example';

  try {
    const kernel = new Kernel({
      environmentSchema: {
        APPLICATION_NAME: { type: 'string' },
      },
    });

    kernel.loadEnvironmentVariables();

    assert.equal(kernel.environment.APPLICATION_NAME, 'ddd-kernel-example');
  } finally {
    if (previousApplicationName === undefined) {
      delete process.env.APPLICATION_NAME;
    } else {
      process.env.APPLICATION_NAME = previousApplicationName;
    }
  }
});

test('validates typed environment variable choices', () => {
  const previousNodeEnvironment = process.env.NODE_ENV;
  const previousHttpPort = process.env.HTTP_PORT;
  const previousEnableJobs = process.env.ENABLE_JOBS;

  process.env.NODE_ENV = 'test';
  process.env.HTTP_PORT = '3000';
  process.env.ENABLE_JOBS = 'false';

  try {
    const kernel = new Kernel({
      environmentSchema: {
        ENABLE_JOBS: { choices: [true, false], type: 'boolean' },
        HTTP_PORT: { choices: [3000, 3001], type: 'number' },
        NODE_ENV: { choices: ['local', 'test'], type: 'string' },
      },
    });

    kernel.loadEnvironmentVariables();

    assert.equal(kernel.environment.NODE_ENV, 'test');
    assert.equal(kernel.environment.HTTP_PORT, 3000);
    assert.equal(kernel.environment.ENABLE_JOBS, false);
  } finally {
    if (previousNodeEnvironment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnvironment;
    }

    if (previousHttpPort === undefined) {
      delete process.env.HTTP_PORT;
    } else {
      process.env.HTTP_PORT = previousHttpPort;
    }

    if (previousEnableJobs === undefined) {
      delete process.env.ENABLE_JOBS;
    } else {
      process.env.ENABLE_JOBS = previousEnableJobs;
    }
  }
});

test('throws when typed environment variable choices do not match', () => {
  const previousNodeEnvironment = process.env.NODE_ENV;

  process.env.NODE_ENV = 'production';

  try {
    const kernel = new Kernel({
      environmentSchema: {
        NODE_ENV: { choices: ['local', 'test'], type: 'string' },
      },
    });

    assert.throws(
      () => kernel.loadEnvironmentVariables(),
      /Environment variable "NODE_ENV" must be one of: local, test/,
    );
  } finally {
    if (previousNodeEnvironment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnvironment;
    }
  }
});
