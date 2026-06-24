import type { Log } from '../../../infrastructure/logs/index.js';

export interface AmqpMessageBusAdapterOptions {
  readonly dsn?: string;
  readonly exchange?: string;
  readonly logger?: Log;
  readonly maxRetries?: number;
  readonly retryDelayInMilliseconds?: number;
  readonly serviceName?: string;
}
