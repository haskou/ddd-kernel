import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';

test('exports types for TypeScript moduleResolution node consumers', async () => {
  if (!existsSync(path.resolve('dist/contracts/kernel/index.d.ts'))) {
    return;
  }

  const temporaryDirectory = path.join(
    await import('node:fs/promises').then(({ mkdtemp }) =>
      mkdtemp(path.join(tmpdir(), 'ddd-kernel-types-')),
    ),
  );
  const packageDirectory = path.resolve('.');
  const packageScopeDirectory = path.join(
    temporaryDirectory,
    'node_modules',
    '@haskou',
  );

  await mkdir(packageScopeDirectory, { recursive: true });
  await symlink(
    packageDirectory,
    path.join(packageScopeDirectory, 'ddd-kernel'),
  );
  await writeFile(
    path.join(temporaryDirectory, 'package.json'),
    JSON.stringify({ type: 'module' }),
  );
  await writeFile(
    path.join(temporaryDirectory, 'index.ts'),
    `
      import type { ConsumerMiddleware } from '@haskou/ddd-kernel/contracts/kernel';
      import type { MessageBus, PublisherHook } from '@haskou/ddd-kernel/contracts/pubsub';
      import type { SchedulerErrorPolicy } from '@haskou/ddd-kernel/scheduler';
      import { ExpressKernelServer } from '@haskou/ddd-kernel/adapters/ui/express';

      const middleware: ConsumerMiddleware | undefined = undefined;
      const messageBus: MessageBus | undefined = undefined;
      const hook: PublisherHook | undefined = undefined;
      const policy: SchedulerErrorPolicy | undefined = undefined;

      void middleware;
      void messageBus;
      void hook;
      void policy;
      void ExpressKernelServer;
    `,
  );
  await writeFile(
    path.join(temporaryDirectory, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        ignoreDeprecations: '6.0',
        module: 'ESNext',
        moduleResolution: 'node',
        noEmit: true,
        skipLibCheck: true,
        strict: true,
        target: 'ES2022',
      },
      include: ['index.ts'],
    }),
  );

  const result = await new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        path.resolve('node_modules/typescript/bin/tsc'),
        '-p',
        path.join(temporaryDirectory, 'tsconfig.json'),
      ],
      { cwd: temporaryDirectory },
    );
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

  assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`);
});
