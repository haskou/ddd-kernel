import type { FormattedValidationError } from './FormattedValidationError.js';

export interface HttpErrorResponse {
  readonly code: string;
  readonly errors?: FormattedValidationError[];
  readonly httpStatus?: number;
  readonly message: string;
}
