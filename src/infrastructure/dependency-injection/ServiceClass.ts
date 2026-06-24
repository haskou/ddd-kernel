export type ServiceClass<T> = {
  readonly prototype: T;
  new (...args: never[]): T;
};
