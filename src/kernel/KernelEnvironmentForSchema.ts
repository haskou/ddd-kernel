import type { KernelDefaultEnvironment } from './KernelDefaultEnvironment.js';
import type { KernelEnvironment } from './KernelEnvironment.js';
import type { KernelEnvironmentSchema } from './KernelEnvironmentSchema.js';

export type KernelEnvironmentForSchema<
  TSchema extends KernelEnvironmentSchema | undefined,
> = TSchema extends KernelEnvironmentSchema
  ? KernelEnvironment<TSchema>
  : KernelDefaultEnvironment;
