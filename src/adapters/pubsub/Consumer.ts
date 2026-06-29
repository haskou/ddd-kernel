import type { KernelConsumer } from '../../contracts/kernel/index.js';
import type { DomainEventConsumer } from '../../domain/DomainEventConsumer.js';
import type {
  DomainEvent,
  DomainEventConsumerContext,
} from '../../domain/index.js';

import { Kernel } from '../../Kernel.js';
import { ConsumerMiddlewarePipeline } from './ConsumerMiddlewarePipeline.js';

export abstract class Consumer implements KernelConsumer {
  constructor(private readonly consumer: DomainEventConsumer) {}

  private async runMiddleware(
    event: DomainEvent,
    consumerContext?: DomainEventConsumerContext,
  ): Promise<void> {
    const pipeline = new ConsumerMiddlewarePipeline(Kernel.consumerMiddleware);
    const metadata = consumerContext?.metadata ?? {};

    await pipeline.execute(
      event,
      {
        causationId: event.getCausationId(),
        correlationId: event.getCorrelationId(),
        eventId: event.eventId,
        eventName: this.eventName,
        exchange: this.exchange,
        kernel: Kernel.active,
        metadata,
        queueName: this.queueName,
        rawMessage: metadata.rawMessage,
      },
      () => this.handler(event),
    );
  }

  public abstract get domainEvent(): typeof DomainEvent;

  public abstract get eventName(): string;

  public abstract get exchange(): string;

  public abstract get queueName(): string;

  public abstract handler(event: DomainEvent): Promise<void>;

  public async init(): Promise<void> {
    await this.consumer.consume(
      this.queueName,
      this.eventName,
      this.domainEvent,
      this.exchange,
      (event, context) => this.runMiddleware(event, context),
    );
  }

  public get<T>(service: unknown): T {
    return Kernel.di.getService<T>(service);
  }
}

export default Consumer;
