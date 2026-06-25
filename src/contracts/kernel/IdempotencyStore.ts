export interface IdempotencyStore {
  has(key: string): Promise<boolean> | boolean;
  mark(key: string): Promise<void> | void;
}
