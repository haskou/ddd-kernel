import type { DomainEventConsumer } from '../../domain/DomainEventConsumer.js';
import type { DomainEventPublisher } from '../../domain/DomainEventPublisher.js';
import type { PublisherHook } from './PublisherHook.js';

export interface MessageBus extends DomainEventConsumer, DomainEventPublisher {
  registerPublisherHooks(...hooks: PublisherHook[]): void;
}
