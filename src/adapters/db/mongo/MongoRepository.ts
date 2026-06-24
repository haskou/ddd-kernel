import type { Collection, Filter } from 'mongodb';

import type { Repository } from '../../../contracts/index.js';
import type { MongoDocumentMapper } from './MongoDocumentMapper.js';

export class MongoRepository<
  TEntity,
  TDocument extends { id: TId },
  TId,
> implements Repository<TEntity, TId> {
  constructor(
    private readonly collection: Collection<TDocument>,
    private readonly mapper: MongoDocumentMapper<TEntity, TDocument, TId>,
  ) {}

  public async findById(id: TId): Promise<TEntity | null> {
    const document = await this.collection.findOne({
      id,
    } as Filter<TDocument>);

    if (!document) {
      return null;
    }

    return this.mapper.toEntity(document as TDocument);
  }

  public async save(entity: TEntity): Promise<void> {
    const document = this.mapper.toDocument(entity);

    await this.collection.updateOne(
      { id: document.id } as Filter<TDocument>,
      { $set: document },
      { upsert: true },
    );
  }

  public async delete(id: TId): Promise<void> {
    await this.collection.deleteOne({
      id,
    } as Filter<TDocument>);
  }
}
