import type { KernelLogger } from '../contracts/index.js';
import type { DependencyInjection } from '../infrastructure/dependency-injection/index.js';
import type { KernelEnvironmentSchema } from './KernelEnvironmentSchema.js';
import type { KernelEnvironmentSchemaInput } from './KernelEnvironmentSchemaInput.js';

export interface KernelOptions<
  TEnvironmentSchema extends KernelEnvironmentSchema | undefined = undefined,
> {
  readonly di?: DependencyInjection;
  readonly environmentSchema?: TEnvironmentSchema extends KernelEnvironmentSchema
    ? TEnvironmentSchema & KernelEnvironmentSchemaInput<TEnvironmentSchema>
    : TEnvironmentSchema;
  readonly logger?: KernelLogger;
  readonly servicesYamlPath?: string;
  readonly sourceDirectory?: string;
}
