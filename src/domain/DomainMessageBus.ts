import type { MessageBus } from '../contracts/pubsub/MessageBus.js';
import type { DomainEventConsumer } from './DomainEventConsumer.js';
import type { DomainEventPublisher } from './DomainEventPublisher.js';

export interface DomainMessageBus
  extends DomainEventConsumer, DomainEventPublisher {
  registerPublisherHooks: MessageBus['registerPublisherHooks'];
}
