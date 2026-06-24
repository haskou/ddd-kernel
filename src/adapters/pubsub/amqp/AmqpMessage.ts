export type AmqpMessage = {
  readonly aggregate_id: string;
  readonly attributes: Record<string, unknown>;
  readonly causation_id?: string;
  readonly correlation_id?: string;
  readonly error?: string;
  readonly event_id: string;
  readonly occurred_on?: number | string;
  readonly retries?: number;
  readonly type: string;
};
