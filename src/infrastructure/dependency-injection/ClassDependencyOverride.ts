import type { DependencyOverrideToken } from './DependencyOverrideToken.js';

export interface ClassDependencyOverride {
  readonly token: DependencyOverrideToken;
  readonly useClass: new (...args: never[]) => unknown;
}
