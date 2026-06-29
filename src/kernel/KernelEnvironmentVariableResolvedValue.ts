import type { KernelEnvironmentValue } from './KernelEnvironmentValue.js';
import type { KernelEnvironmentVariableDefinition } from './KernelEnvironmentVariableDefinition.js';
import type { KernelEnvironmentVariablePrimitive } from './KernelEnvironmentVariablePrimitive.js';
import type { KernelEnvironmentVariableType } from './KernelEnvironmentVariableType.js';

export type KernelEnvironmentVariableResolvedValue<
  TDefinition extends KernelEnvironmentVariableDefinition,
> = TDefinition extends {
  readonly choices: readonly (infer TChoice extends KernelEnvironmentValue)[];
}
  ? TChoice
  : TDefinition extends KernelEnvironmentVariableDefinition<
        infer TType extends KernelEnvironmentVariableType
      >
    ? KernelEnvironmentVariablePrimitive<TType>
    : never;
