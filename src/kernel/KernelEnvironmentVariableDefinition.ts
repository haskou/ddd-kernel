import type { KernelEnvironmentVariablePrimitive } from './KernelEnvironmentVariablePrimitive.js';
import type { KernelEnvironmentVariableType } from './KernelEnvironmentVariableType.js';

export interface KernelEnvironmentVariableDefinition<
  TType extends KernelEnvironmentVariableType = KernelEnvironmentVariableType,
  TRequired extends boolean = boolean,
> {
  readonly defaultValue?: KernelEnvironmentVariablePrimitive<TType>;
  readonly required?: TRequired;
  readonly type: TType;
}
