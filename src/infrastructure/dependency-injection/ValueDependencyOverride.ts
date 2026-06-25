import type { DependencyOverrideToken } from './DependencyOverrideToken.js';

export interface ValueDependencyOverride {
  readonly token: DependencyOverrideToken;
  readonly useValue: unknown;
}
