import type { Channel } from 'amqplib';

import type { Constructor, DomainEvent } from '../../../domain/index.js';
import type { DomainEventHandler } from './DomainEventHandler.js';

export type ConsumerContext = {
  readonly bindingKey: string;
  readonly channel: Channel;
  readonly DomainEventInstance: Constructor<DomainEvent>;
  readonly handler: DomainEventHandler;
  readonly queueName: string;
};
