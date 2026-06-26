import type { KernelEnvironmentSchema } from './KernelEnvironmentSchema.js';

export interface KernelEnvironmentVariablesOptions<
  TSchema extends KernelEnvironmentSchema | undefined = undefined,
> {
  readonly override?: boolean;
  readonly path?: string;
  readonly schema?: TSchema;
}
