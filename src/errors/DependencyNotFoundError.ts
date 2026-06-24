import { KernelError } from './KernelError.js';

export class DependencyNotFoundError extends KernelError {
  constructor(token: string) {
    super(`Dependency not found for token "${token}".`);
    this.name = 'DependencyNotFoundError';
  }
}
