import type { MessageMetadata } from './MessageMetadata.js';

export interface Message<Name extends string = string, Payload = unknown> {
  readonly name: Name;
  readonly payload: Payload;
  readonly metadata?: MessageMetadata;
}
