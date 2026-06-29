export interface KernelConsumer {
  readonly queueName: string;

  init(): Promise<void>;
}
