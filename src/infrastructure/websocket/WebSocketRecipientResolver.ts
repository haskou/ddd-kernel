import type { DomainEvent } from '../../domain/index.js';

export interface WebSocketRecipientResolver<TIdentity = string> {
  resolve(event: DomainEvent): Iterable<TIdentity>;
}
