import assert from 'node:assert/strict';
import test from 'node:test';

import { Kernel } from '../../../../dist/index.js';
import { Route } from '../../../../dist/adapters/ui/routes/index.js';

class TestRoute extends Route {}

test('resolves legacy route services through the active kernel container', () => {
  class Service {}

  const service = new Service();

  new Kernel({
    di: {
      getService(requestedService) {
        assert.equal(requestedService, Service);

        return service;
      },
    },
  });

  const route = new TestRoute();

  assert.equal(route.get(Service), service);
});
