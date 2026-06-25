import type { DependencyOverride } from '../infrastructure/dependency-injection/index.js';

export interface KernelDependencyInjectionOptions {
  readonly containerBuild?: boolean;
  readonly overrides?: readonly DependencyOverride[];
  readonly servicesYamlPath?: string;
  readonly sourceDirectory?: string;
}
