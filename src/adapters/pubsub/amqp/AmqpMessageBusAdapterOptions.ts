import type {
  PublisherHook,
  PublisherHookErrorPolicy,
} from '../../../contracts/index.js';
import type { Log } from '../../../infrastructure/logs/index.js';

export interface AmqpMessageBusAdapterOptions {
  readonly dsn?: string;
  readonly exchange?: string;
  readonly logger?: Log;
  readonly maxRetries?: number;
  readonly publisherHookErrorPolicy?: PublisherHookErrorPolicy;
  readonly publisherHooks?: PublisherHook[];
  readonly retryDelayInMilliseconds?: number;
  readonly serviceName?: string;
}
