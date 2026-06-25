import type { KernelLogger } from '../../../contracts/index.js';
import type { ErrorResponseHandler } from './ErrorResponseHandler.js';

export interface HttpErrorHandlerOptions {
  readonly exposeUnhandledErrorsIn?: readonly string[];
  readonly handlers?: readonly ErrorResponseHandler[];
  readonly logger?: KernelLogger;
}
