import type { KernelEnvironmentVariableDefinition } from './KernelEnvironmentVariableDefinition.js';
import type { KernelEnvironmentVariablePrimitive } from './KernelEnvironmentVariablePrimitive.js';
import type { KernelEnvironmentVariableType } from './KernelEnvironmentVariableType.js';

export type KernelEnvironmentVariable<
  TDefinition extends KernelEnvironmentVariableDefinition,
> =
  TDefinition extends KernelEnvironmentVariableDefinition<
    infer TType extends KernelEnvironmentVariableType,
    infer TRequired extends boolean
  >
    ? TDefinition extends { readonly defaultValue: unknown }
      ? KernelEnvironmentVariablePrimitive<TType>
      : TRequired extends true
        ? KernelEnvironmentVariablePrimitive<TType>
        : KernelEnvironmentVariablePrimitive<TType> | undefined
    : never;
