import type { IdempotencyStore } from '../../contracts/index.js';

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly claimedKeys = new Set<string>();
  private readonly handledKeys = new Set<string>();

  public claim(key: string): boolean {
    if (this.handledKeys.has(key) || this.claimedKeys.has(key)) {
      return false;
    }

    this.claimedKeys.add(key);

    return true;
  }

  public commit(key: string): void {
    this.claimedKeys.delete(key);
    this.handledKeys.add(key);
  }

  public release(key: string): void {
    this.claimedKeys.delete(key);
  }

  public has(key: string): boolean {
    return this.handledKeys.has(key);
  }

  public mark(key: string): void {
    this.handledKeys.add(key);
  }
}

export default InMemoryIdempotencyStore;
