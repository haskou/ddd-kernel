import type { KernelLogger } from '../contracts/index.js';
import type { DependencyInjection } from '../infrastructure/dependency-injection/index.js';

export interface KernelOptions {
  readonly di?: DependencyInjection;
  readonly logger?: KernelLogger;
  readonly servicesYamlPath?: string;
  readonly sourceDirectory?: string;
}
