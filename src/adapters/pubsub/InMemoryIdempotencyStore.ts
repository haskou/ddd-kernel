import type { IdempotencyStore } from '../../contracts/index.js';

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly handledKeys = new Set<string>();

  public has(key: string): boolean {
    return this.handledKeys.has(key);
  }

  public mark(key: string): void {
    this.handledKeys.add(key);
  }
}

export default InMemoryIdempotencyStore;
