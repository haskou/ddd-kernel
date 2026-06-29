import type { KernelEnvironmentSchema } from './KernelEnvironmentSchema.js';
import type { KernelEnvironmentSchemaInput } from './KernelEnvironmentSchemaInput.js';

export interface KernelEnvironmentVariablesOptions<
  TSchema extends KernelEnvironmentSchema | undefined = undefined,
> {
  readonly override?: boolean;
  readonly path?: string;
  readonly schema?: TSchema extends KernelEnvironmentSchema
    ? TSchema & KernelEnvironmentSchemaInput<TSchema>
    : TSchema;
}
