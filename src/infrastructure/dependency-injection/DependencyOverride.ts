import type { ClassDependencyOverride } from './ClassDependencyOverride.js';
import type { FactoryDependencyOverride } from './FactoryDependencyOverride.js';
import type { ValueDependencyOverride } from './ValueDependencyOverride.js';

export type DependencyOverride =
  ClassDependencyOverride | FactoryDependencyOverride | ValueDependencyOverride;
