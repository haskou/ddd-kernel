import type { Kernel } from '../../Kernel.js';

export interface ConsumerExecutionContext {
  readonly causationId?: string;
  readonly correlationId?: string;
  readonly eventId: string;
  readonly eventName: string;
  readonly exchange: string;
  readonly kernel: Kernel;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly rawMessage?: unknown;
  readonly queueName: string;
}
