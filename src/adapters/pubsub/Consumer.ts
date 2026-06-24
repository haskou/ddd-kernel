import type { ConsumerMiddleware } from '../../contracts/index.js';
import type { DomainEventConsumer } from '../../domain/DomainEventConsumer.js';
import type { DomainEvent } from '../../domain/index.js';

import { Kernel } from '../../Kernel.js';

export abstract class Consumer {
  constructor(private readonly consumer: DomainEventConsumer) {}

  private async runMiddleware(
    event: DomainEvent,
    middlewares: readonly ConsumerMiddleware[],
    index: number,
  ): Promise<void> {
    const middleware = middlewares[index];

    if (!middleware) {
      await this.handler(event);

      return;
    }

    await middleware.handle(event, () =>
      this.runMiddleware(event, middlewares, index + 1),
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
      (event) => this.runMiddleware(event, Kernel.consumerMiddleware, 0),
    );
  }

  public get<T>(service: unknown): T {
    return Kernel.di.getService<T>(service);
  }
}

export default Consumer;
