import type { KernelLogger } from '../contracts/index.js';
import type { DependencyInjection } from '../infrastructure/dependency-injection/index.js';
import type { KernelEnvironmentSchema } from './KernelEnvironmentSchema.js';

export interface KernelOptions<
  TEnvironmentSchema extends KernelEnvironmentSchema | undefined = undefined,
> {
  readonly di?: DependencyInjection;
  readonly environmentSchema?: TEnvironmentSchema;
  readonly logger?: KernelLogger;
  readonly servicesYamlPath?: string;
  readonly sourceDirectory?: string;
}
