import type { DomainEvent } from '../../domain/index.js';

export interface ConsumerMiddleware {
  handle(event: DomainEvent, next: () => Promise<void>): Promise<void>;
}
