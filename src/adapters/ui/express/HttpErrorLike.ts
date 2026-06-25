export interface HttpErrorLike {
  readonly code?: string;
  readonly httpCode?: number;
  readonly message?: string;
  readonly name?: string;
  readonly status?: number;
  readonly statusCode?: number;
}
