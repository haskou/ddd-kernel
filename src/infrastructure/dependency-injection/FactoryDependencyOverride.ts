import type { DependencyOverrideFactory } from './DependencyOverrideFactory.js';
import type { DependencyOverrideToken } from './DependencyOverrideToken.js';

export interface FactoryDependencyOverride {
  readonly token: DependencyOverrideToken;
  readonly useFactory: DependencyOverrideFactory;
}
