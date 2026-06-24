import type { DomainEvent } from '../pubsub/DomainEvent.js';
import type { ServiceResolver } from './ServiceResolver.js';

export interface HandlerContext {
  readonly di: ServiceResolver;
  readonly publish: (event: DomainEvent) => Promise<void>;
}
