import type { Message } from './Message.js';

export interface DomainEvent<
  Name extends string = string,
  Payload = unknown,
> extends Message<Name, Payload> {
  readonly occurredAt: Date;
}
