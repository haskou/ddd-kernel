import type { KernelEnvironmentSchema } from './KernelEnvironmentSchema.js';
import type { KernelEnvironmentValue } from './KernelEnvironmentValue.js';
import type { KernelEnvironmentVariable } from './KernelEnvironmentVariable.js';

export type KernelEnvironment<TSchema extends KernelEnvironmentSchema> = {
  readonly [key: string]: KernelEnvironmentValue | undefined;
} & {
  readonly [TKey in keyof TSchema]: KernelEnvironmentVariable<TSchema[TKey]>;
};
