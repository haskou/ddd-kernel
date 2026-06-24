import type { Repository } from '../../../contracts/index.js';

export class InMemoryRepository<
  TEntity extends { id: TId },
  TId,
> implements Repository<TEntity, TId> {
  private readonly entities = new Map<TId, TEntity>();

  public findById(id: TId): Promise<TEntity | null> {
    return Promise.resolve(this.entities.get(id) ?? null);
  }

  public save(entity: TEntity): Promise<void> {
    this.entities.set(entity.id, entity);

    return Promise.resolve();
  }

  public delete(id: TId): Promise<void> {
    this.entities.delete(id);

    return Promise.resolve();
  }
}
