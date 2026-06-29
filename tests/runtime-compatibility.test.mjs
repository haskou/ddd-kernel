import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

async function createPackageFixture() {
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), 'ddd-kernel-runtime-'),
  );
  const packageScopeDirectory = path.join(
    temporaryDirectory,
    'node_modules',
    '@haskou',
  );

  await mkdir(path.join(temporaryDirectory, 'src'), { recursive: true });
  await mkdir(packageScopeDirectory, { recursive: true });
  await symlink(
    path.resolve('.'),
    path.join(packageScopeDirectory, 'ddd-kernel'),
  );

  return temporaryDirectory;
}

async function runNode(args, cwd, environmentVariables = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd,
      env: {
        ...process.env,
        ...environmentVariables,
      },
    });
    let stderr = '';
    let stdout = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.on('close', (code) => resolve({ code, stderr, stdout }));
  });
}

test('runs a TypeScript runtime fixture through ts-node with public subpaths', async () => {
  if (!existsSync(path.resolve('dist/index.js'))) {
    return;
  }

  const temporaryDirectory = await createPackageFixture();

  await writeFile(
    path.join(temporaryDirectory, 'package.json'),
    JSON.stringify({ type: 'module' }),
  );
  await writeFile(
    path.join(temporaryDirectory, 'services.yaml'),
    'services: {}\n',
  );
  await writeFile(
    path.join(temporaryDirectory, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        skipLibCheck: true,
        strict: true,
        target: 'ES2022',
      },
    }),
  );
  await writeFile(
    path.join(temporaryDirectory, 'index.ts'),
    `
      import Kernel from '@haskou/ddd-kernel';
      import { DomainEventPublisher } from '@haskou/ddd-kernel/domain';
      import { Consumer } from '@haskou/ddd-kernel/adapters/pubsub';
      import { Scheduler } from '@haskou/ddd-kernel/scheduler';

      class MessageBus extends DomainEventPublisher {
        public async publish() {}
      }

      const kernel = new Kernel({
        environmentSchema: {
          HTTP_PORT: { defaultValue: 3000, type: 'number' },
        } as const,
        servicesYamlPath: new URL('services.yaml', import.meta.url).pathname,
        sourceDirectory: new URL('src', import.meta.url).pathname,
      });

      kernel.loadEnvironmentVariables('');
      await kernel.dependencyInjection({
        containerBuild: false,
        overrides: [{ token: DomainEventPublisher, useClass: MessageBus }],
      });

      if (kernel.environment.HTTP_PORT !== 3000) {
        throw new Error('environment schema default was not applied');
      }

      if (!(kernel.di.getService(DomainEventPublisher) instanceof MessageBus)) {
        throw new Error('DomainEventPublisher override was not applied');
      }

      void Consumer;
      void Scheduler;
    `,
  );

  const result = await runNode(
    [
      '--loader',
      path.resolve('node_modules/ts-node/esm.mjs'),
      path.join(temporaryDirectory, 'index.ts'),
    ],
    temporaryDirectory,
    { HTTP_PORT: '', TS_NODE_TRANSPILE_ONLY: 'true' },
  );

  assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`);
});

test('runs a CommonJS runtime fixture from dist with public subpaths', async () => {
  if (!existsSync(path.resolve('dist/index.cjs'))) {
    return;
  }

  const temporaryDirectory = await createPackageFixture();

  await writeFile(
    path.join(temporaryDirectory, 'package.json'),
    JSON.stringify({ type: 'commonjs' }),
  );
  await writeFile(
    path.join(temporaryDirectory, 'services.yaml'),
    'services: {}\n',
  );
  await writeFile(
    path.join(temporaryDirectory, 'index.cjs'),
    `
      const KernelPackage = require('@haskou/ddd-kernel');
      const { DomainEventPublisher } = require('@haskou/ddd-kernel/domain');
      const { Consumer } = require('@haskou/ddd-kernel/adapters/pubsub');
      const { Scheduler } = require('@haskou/ddd-kernel/scheduler');

      class MessageBus extends DomainEventPublisher {
        async publish() {}
      }

      (async () => {
        const kernel = new KernelPackage.Kernel({
          environmentSchema: {
            HTTP_PORT: { defaultValue: 3000, type: 'number' },
          },
          servicesYamlPath: require('node:path').join(process.cwd(), 'services.yaml'),
          sourceDirectory: require('node:path').join(process.cwd(), 'src'),
        });

        kernel.loadEnvironmentVariables('');
        await kernel.dependencyInjection({
          containerBuild: false,
          overrides: [{ token: DomainEventPublisher, useClass: MessageBus }],
        });

        if (kernel.environment.HTTP_PORT !== 3000) {
          throw new Error('environment schema default was not applied');
        }

        if (!(kernel.di.getService(DomainEventPublisher) instanceof MessageBus)) {
          throw new Error('DomainEventPublisher override was not applied');
        }

        void Consumer;
        void Scheduler;
      })().catch((error) => {
        console.error(error);
        process.exit(1);
      });
    `,
  );

  const result = await runNode(
    [path.join(temporaryDirectory, 'index.cjs')],
    temporaryDirectory,
    { HTTP_PORT: '' },
  );

  assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`);
});
