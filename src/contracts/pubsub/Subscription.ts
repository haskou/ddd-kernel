export interface Subscription {
  close(): Promise<void>;
}
