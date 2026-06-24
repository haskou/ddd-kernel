import { KernelError } from './KernelError.js';

export class HandlerNotFoundError extends KernelError {
  constructor(kind: string, name: string) {
    super(`${kind} handler not found for "${name}".`);
    this.name = 'HandlerNotFoundError';
  }
}
