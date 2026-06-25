import type { DomainEvent } from '../../domain/DomainEvent.js';
import type { DomainEvent as ContractDomainEvent } from './DomainEvent.js';
import type { Message } from './Message.js';

export interface PublishContext<
  TMessage extends Message | ContractDomainEvent = Message,
> {
  readonly domainEvent?: DomainEvent;
  readonly message: TMessage;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly topic: string;
}
