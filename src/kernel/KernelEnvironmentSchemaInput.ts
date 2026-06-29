import type { KernelEnvironmentSchema } from './KernelEnvironmentSchema.js';
import type { KernelEnvironmentVariableDefinition } from './KernelEnvironmentVariableDefinition.js';
import type { KernelEnvironmentVariablePrimitive } from './KernelEnvironmentVariablePrimitive.js';
import type { KernelEnvironmentVariableType } from './KernelEnvironmentVariableType.js';

export type KernelEnvironmentSchemaInput<
  TSchema extends KernelEnvironmentSchema,
> = {
  readonly [TKey in keyof TSchema]: TSchema[TKey] extends {
    readonly choices: infer TChoices extends
      readonly KernelEnvironmentVariablePrimitive<TSchema[TKey]['type']>[];
    readonly type: infer TType extends KernelEnvironmentVariableType;
  }
    ? KernelEnvironmentVariableDefinition<
        TType,
        TSchema[TKey] extends { readonly required: true } ? true : boolean,
        TChoices
      >
    : TSchema[TKey] extends {
          readonly type: infer TType extends KernelEnvironmentVariableType;
        }
      ? KernelEnvironmentVariableDefinition<
          TType,
          TSchema[TKey] extends { readonly required: true } ? true : boolean
        >
      : never;
};
