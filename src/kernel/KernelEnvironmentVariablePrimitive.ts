import type { KernelEnvironmentVariableType } from './KernelEnvironmentVariableType.js';

export type KernelEnvironmentVariablePrimitive<
  TType extends KernelEnvironmentVariableType,
> = TType extends 'boolean'
  ? boolean
  : TType extends 'number'
    ? number
    : string;
