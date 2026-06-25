import type { HttpErrorLike } from './HttpErrorLike.js';

export interface PayloadTooLargeError extends HttpErrorLike {
  readonly type?: string;
}
