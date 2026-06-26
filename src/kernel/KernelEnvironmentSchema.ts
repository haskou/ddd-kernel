import type { KernelEnvironmentVariableDefinition } from './KernelEnvironmentVariableDefinition.js';

export type KernelEnvironmentSchema = Readonly<
  Record<string, KernelEnvironmentVariableDefinition>
>;
