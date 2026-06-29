import type { KernelEnvironmentValue } from './KernelEnvironmentValue.js';
import type { KernelEnvironmentVariablePrimitive } from './KernelEnvironmentVariablePrimitive.js';
import type { KernelEnvironmentVariableType } from './KernelEnvironmentVariableType.js';

export interface KernelEnvironmentVariableDefinition<
  TType extends KernelEnvironmentVariableType = KernelEnvironmentVariableType,
  TRequired extends boolean = boolean,
  TChoices extends readonly KernelEnvironmentValue[] | undefined =
    | readonly KernelEnvironmentVariablePrimitive<TType>[]
    | undefined,
> {
  readonly choices?: TChoices;
  readonly defaultValue?: KernelEnvironmentVariablePrimitive<TType>;
  readonly description?: string;
  readonly required?: TRequired;
  readonly sensitive?: boolean;
  readonly type: TType;
}
