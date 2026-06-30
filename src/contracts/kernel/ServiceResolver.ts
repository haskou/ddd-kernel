export interface ServiceResolver {
  getService<T>(serviceName: unknown): T;
  hasService?(serviceName: unknown): boolean;
}
