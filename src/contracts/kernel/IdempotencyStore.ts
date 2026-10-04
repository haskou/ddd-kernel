export interface IdempotencyStore {
  claim(key: string): Promise<boolean> | boolean;
  commit(key: string): Promise<void> | void;
  release(key: string): Promise<void> | void;
}
