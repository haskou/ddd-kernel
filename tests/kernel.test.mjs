import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createKernel, Kernel } from '../dist/index.js';

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
    await writeFile(path.join(sourceDirectory, 'Service.ts'), 'export default class Service {}\n');
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
