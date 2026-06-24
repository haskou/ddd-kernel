import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { WinstonLogger } from '../../../dist/infrastructure/logs/index.js';

test('writes prefixed log messages to the configured file transport', async (context) => {
  const rootDirectory = await mkdtemp(path.join(tmpdir(), 'ddd-kernel-logs-'));
  const logFile = path.join(rootDirectory, 'logs', 'service.log');
  const logger = new WinstonLogger({
    logDirectory: 'logs',
    logLevel: 'debug',
    rootDirectory,
    serviceName: 'service',
  });

  context.after(async () => {
    await rm(rootDirectory, { force: true, recursive: true });
  });

  logger.run('[api] ');
  logger.info('{"userId":"user-id","ignored":null}');
  logger.warn('plain warning');
  logger.error('plain error');
  logger.debug('plain debug');

  await new Promise((resolve) => setTimeout(resolve, 50));

  const content = await readFile(logFile, 'utf8');
  const lines = content
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));

  assert.deepEqual(
    lines.map((line) => line.message),
    [
      '[api] {"userId":"user-id","ignored":null}',
      '[api] plain warning',
      '[api] plain error',
      '[api] plain debug',
    ],
  );
});

test('formats console messages from primitives, invalid JSON and structured JSON', () => {
  const logger = new WinstonLogger();

  assert.equal(logger.formatConsoleMessage(123), '123');
  assert.equal(logger.formatConsoleMessage('plain'), 'plain');
  assert.equal(logger.formatConsoleMessage('['), '[');
  assert.equal(logger.formatConsoleMessage('null'), 'null');
  assert.equal(logger.formatConsoleMessage('["a"]'), '["a"]');
  assert.equal(
    logger.formatConsoleMessage(
      '{"name":"Ada","tags":["admin",2],"meta":{"enabled":true}}',
    ),
    'name="Ada" tags=["admin",2] meta={"enabled":true}',
  );
});

test('uses environment defaults when logger options are omitted', async (context) => {
  const originalCwd = process.cwd();

  const rootDirectory = await mkdtemp(path.join(tmpdir(), 'ddd-kernel-logs-'));

  const originalLogUrl = process.env.LOG_URL;
  const originalServiceName = process.env.SERVICE_NAME;
  const originalLogLevel = process.env.LOG_LEVEL;

  process.env.LOG_URL = 'environment-logs';
  process.env.SERVICE_NAME = 'environment-service';
  process.env.LOG_LEVEL = 'info';

  process.chdir(rootDirectory);

  context.after(async () => {
    if (originalLogUrl === undefined) {
      delete process.env.LOG_URL;
    } else {
      process.env.LOG_URL = originalLogUrl;
    }

    if (originalServiceName === undefined) {
      delete process.env.SERVICE_NAME;
    } else {
      process.env.SERVICE_NAME = originalServiceName;
    }

    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLogLevel;
    }

    process.chdir(originalCwd);

    await rm(rootDirectory, { force: true, recursive: true });
  });

  const logger = new WinstonLogger();

  logger.run();
  logger.info('environment message');

  await new Promise((resolve) => setTimeout(resolve, 100));

  const content = await readFile(
    path.join(rootDirectory, 'environment-logs', 'environment-service.log'),
    'utf8',
  );

  assert.match(content, /environment message/);
});

test('uses built-in defaults when neither options nor environment are provided', async (context) => {
  const rootDirectory = await mkdtemp(path.join(tmpdir(), 'ddd-kernel-logs-'));
  const previousDirectory = process.cwd();
  const originalLogUrl = process.env.LOG_URL;
  const originalServiceName = process.env.SERVICE_NAME;
  const originalLogLevel = process.env.LOG_LEVEL;

  delete process.env.LOG_URL;
  delete process.env.SERVICE_NAME;
  delete process.env.LOG_LEVEL;
  process.chdir(rootDirectory);
  context.after(async () => {
    if (originalLogUrl !== undefined) {
      process.env.LOG_URL = originalLogUrl;
    }

    if (originalServiceName !== undefined) {
      process.env.SERVICE_NAME = originalServiceName;
    }

    if (originalLogLevel !== undefined) {
      process.env.LOG_LEVEL = originalLogLevel;
    }

    process.chdir(previousDirectory);
    await rm(rootDirectory, { force: true, recursive: true });
  });

  const logger = new WinstonLogger();

  logger.info('default message');

  await new Promise((resolve) => setTimeout(resolve, 50));

  const content = await readFile(
    path.join(rootDirectory, 'logs', 'service.log'),
    'utf8',
  );

  assert.match(content, /default message/);
});

test('formats console entries with missing timestamps', () => {
  const logger = new WinstonLogger();
  const formatter = logger.consoleFormat();
  const transformed = formatter.transform({
    [Symbol.for('level')]: 'info',
    level: 'info',
    message: 'hello',
  });

  assert.match(String(transformed?.[Symbol.for('message')]), /info/);
  assert.equal(logger.formatTimestamp(undefined), '');
});
