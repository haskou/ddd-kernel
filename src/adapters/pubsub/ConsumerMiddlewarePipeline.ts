import type {
  ConsumerExecutionContext,
  ConsumerMiddleware,
} from '../../contracts/index.js';
import type { DomainEvent } from '../../domain/index.js';

export class ConsumerMiddlewarePipeline {
  constructor(private readonly middlewares: readonly ConsumerMiddleware[]) {}

  private async run(
    event: DomainEvent,
    context: ConsumerExecutionContext,
    handler: () => Promise<void>,
    index: number,
  ): Promise<void> {
    const middleware = this.middlewares[index];

    if (!middleware) {
      await handler();

      return;
    }

    await middleware.handle(
      event,
      () => this.run(event, context, handler, index + 1),
      context,
    );
  }

  public async execute(
    event: DomainEvent,
    context: ConsumerExecutionContext,
    handler: () => Promise<void>,
  ): Promise<void> {
    await this.run(event, context, handler, 0);
  }
}
