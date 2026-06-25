import type { ValidationError } from './ValidationError.js';

export interface ErrorExplanation {
  readonly errors?: ValidationError[];
}
