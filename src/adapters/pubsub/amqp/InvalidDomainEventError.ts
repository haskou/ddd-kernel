export class InvalidDomainEventError extends Error {
  constructor(message: string) {
    super(`Invalid domain event: ${message}`);
    this.name = 'InvalidDomainEventError';
  }
}
