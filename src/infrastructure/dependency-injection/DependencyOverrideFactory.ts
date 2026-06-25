import type { ServiceResolver } from '../../contracts/index.js';

export type DependencyOverrideFactory = (resolver: ServiceResolver) => unknown;
