import assert from 'node:assert/strict';
import test from 'node:test';

import { MongoRepository } from '../../../../dist/adapters/db/mongo/index.js';

test('maps found Mongo documents into entities', async () => {
  const document = { id: 'user-id', name: 'Ada' };
  const collection = {
    findOne: async (filter) => {
      assert.deepEqual(filter, { id: 'user-id' });

      return document;
    },
  };
  const mapper = {
    toDocument: (entity) => entity,
    toEntity: (mongoDocument) => ({ ...mongoDocument, mapped: true }),
  };
  const repository = new MongoRepository(collection, mapper);

  assert.deepEqual(await repository.findById('user-id'), {
    id: 'user-id',
    mapped: true,
    name: 'Ada',
  });
});

test('returns null when Mongo document is missing', async () => {
  const repository = new MongoRepository(
    { findOne: async () => null },
    { toDocument: (entity) => entity, toEntity: (document) => document },
  );

  assert.equal(await repository.findById('missing'), null);
});

test('upserts and deletes Mongo documents by id', async () => {
  const calls = [];
  const collection = {
    deleteOne: async (filter) => {
      calls.push(['deleteOne', filter]);
    },
    updateOne: async (filter, update, options) => {
      calls.push(['updateOne', filter, update, options]);
    },
  };
  const repository = new MongoRepository(collection, {
    toDocument: (entity) => ({ id: entity.id, name: entity.name }),
    toEntity: (document) => document,
  });

  await repository.save({ id: 'user-id', name: 'Ada' });
  await repository.delete('user-id');

  assert.deepEqual(calls, [
    [
      'updateOne',
      { id: 'user-id' },
      { $set: { id: 'user-id', name: 'Ada' } },
      { upsert: true },
    ],
    ['deleteOne', { id: 'user-id' }],
  ]);
});
