import type { KernelEnvironmentValue } from './KernelEnvironmentValue.js';
import type { KernelEnvironmentVariableDefinition } from './KernelEnvironmentVariableDefinition.js';
import type { KernelEnvironmentVariablePrimitive } from './KernelEnvironmentVariablePrimitive.js';
import type { KernelEnvironmentVariableType } from './KernelEnvironmentVariableType.js';

export type KernelEnvironmentVariable<
  TDefinition extends KernelEnvironmentVariableDefinition,
> =
  TDefinition extends KernelEnvironmentVariableDefinition<
    infer TType extends KernelEnvironmentVariableType,
    infer TRequired extends boolean,
    infer TChoices extends readonly KernelEnvironmentValue[] | undefined
  >
    ? TDefinition extends { readonly defaultValue: unknown }
      ? TChoices extends readonly KernelEnvironmentVariablePrimitive<TType>[]
        ? TChoices[number]
        : KernelEnvironmentVariablePrimitive<TType>
      : TRequired extends true
        ? TChoices extends readonly KernelEnvironmentVariablePrimitive<TType>[]
          ? TChoices[number]
          : KernelEnvironmentVariablePrimitive<TType>
        :
            | (TChoices extends readonly KernelEnvironmentVariablePrimitive<TType>[]
                ? TChoices[number]
                : KernelEnvironmentVariablePrimitive<TType>)
            | undefined
    : never;
