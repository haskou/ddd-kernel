export interface FormattedValidationError {
  readonly details?: Record<string, string>;
  readonly property: string;
  readonly value: unknown;
}
