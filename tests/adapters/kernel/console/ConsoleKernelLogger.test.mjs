import assert from 'node:assert/strict';
import test from 'node:test';

import { ConsoleKernelLogger } from '../../../../dist/adapters/kernel/console/index.js';

test('delegates messages to console methods', (context) => {
  const calls = [];
  const originals = {
    debug: console.debug,
    error: console.error,
    info: console.info,
    warn: console.warn,
  };

  console.debug = (message) => calls.push(['debug', message]);
  console.error = (message) => calls.push(['error', message]);
  console.info = (message) => calls.push(['info', message]);
  console.warn = (message) => calls.push(['warn', message]);
  context.after(() => {
    console.debug = originals.debug;
    console.error = originals.error;
    console.info = originals.info;
    console.warn = originals.warn;
  });

  const logger = new ConsoleKernelLogger();

  logger.debug('debug');
  logger.error('error');
  logger.info('info');
  logger.warn('warn');

  assert.deepEqual(calls, [
    ['debug', 'debug'],
    ['error', 'error'],
    ['info', 'info'],
    ['warn', 'warn'],
  ]);
});
