import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryRepository } from '../../../../dist/adapters/db/in-memory/index.js';

test('saves, finds and deletes entities by id', async () => {
  const repository = new InMemoryRepository();
  const entity = { id: 'user-id', name: 'Ada' };

  assert.equal(await repository.findById(entity.id), null);

  await repository.save(entity);

  assert.equal(await repository.findById(entity.id), entity);

  await repository.delete(entity.id);

  assert.equal(await repository.findById(entity.id), null);
});
