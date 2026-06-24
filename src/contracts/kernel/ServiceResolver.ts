export interface ServiceResolver {
  getService<T>(serviceName: unknown): T;
}
