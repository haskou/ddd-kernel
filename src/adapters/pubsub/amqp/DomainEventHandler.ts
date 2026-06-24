import type { DomainEvent } from '../../../domain/index.js';

export type DomainEventHandler = (event: DomainEvent) => Promise<void>;
