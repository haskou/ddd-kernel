import assert from 'node:assert/strict';
import test from 'node:test';

import { RoutePrefix } from '../../../../dist/adapters/ui/express/index.js';

test('normalizes empty and root prefixes', () => {
  assert.equal(RoutePrefix.fromEnvironment(undefined).toString(), '');
  assert.equal(new RoutePrefix('/').toString(), '');
  assert.equal(new RoutePrefix('///').toString(), '');
});

test('normalizes slashes and detects included request paths', () => {
  const prefix = new RoutePrefix('/api/v1/');

  assert.equal(prefix.toString(), '/api/v1');
  assert.equal(prefix.isEmpty(), false);
  assert.equal(prefix.includes('/api/v1'), true);
  assert.equal(prefix.includes('/api/v1/users'), true);
  assert.equal(prefix.includes('/api/v10'), false);
});

test('empty prefixes do not include request paths', () => {
  const prefix = new RoutePrefix(undefined);

  assert.equal(prefix.isEmpty(), true);
  assert.equal(prefix.includes('/api'), false);
});
