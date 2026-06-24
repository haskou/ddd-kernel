import type { DefinitionMetadata } from './DefinitionMetadata.js';

export type ContainerInternals = {
  readonly _alias?: Map<string, string>;
  readonly _definitions?: Map<string, DefinitionMetadata>;
};
