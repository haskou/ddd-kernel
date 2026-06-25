import type {
  DomainEvent,
  DomainEventConsumerContext,
} from '../../../domain/index.js';

export type DomainEventHandler = (
  event: DomainEvent,
  context?: DomainEventConsumerContext,
) => Promise<void>;
