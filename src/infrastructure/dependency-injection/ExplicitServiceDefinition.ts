import type { ExplicitServiceClass } from './ExplicitServiceClass.js';

export interface ExplicitServiceDefinition {
  readonly dependencyClasses?: readonly unknown[];
  readonly serviceClass: ExplicitServiceClass;
  readonly sourcePath: string;
}
