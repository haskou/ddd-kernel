import type { DependencyOverride } from './DependencyOverride.js';

export interface DependencyInjectionOptions {
  readonly containerBuild?: boolean;
  readonly overrides?: readonly DependencyOverride[];
  readonly servicesYamlPath: string;
  readonly sourceDirectory: string;
}
