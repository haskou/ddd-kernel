export interface ValidationError {
  readonly children?: ValidationError[];
  readonly constraints?: Record<string, string>;
  readonly property: string;
  readonly value?: unknown;
}
