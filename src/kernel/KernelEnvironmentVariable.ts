import type { KernelEnvironmentVariableDefinition } from './KernelEnvironmentVariableDefinition.js';
import type { KernelEnvironmentVariableResolvedValue } from './KernelEnvironmentVariableResolvedValue.js';

export type KernelEnvironmentVariable<
  TDefinition extends KernelEnvironmentVariableDefinition,
> = TDefinition extends { readonly defaultValue: unknown }
  ? KernelEnvironmentVariableResolvedValue<TDefinition>
  : TDefinition extends { readonly required: true }
    ? KernelEnvironmentVariableResolvedValue<TDefinition>
    : KernelEnvironmentVariableResolvedValue<TDefinition> | undefined;
