import type { KernelLogger } from '../../../contracts/index.js';

export interface HttpErrorHandlerOptions {
  readonly exposeUnhandledErrorsIn?: readonly string[];
  readonly logger?: KernelLogger;
}
