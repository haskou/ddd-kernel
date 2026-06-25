import type {
  DomainEvent,
  HandlerContext,
  MessageHandler,
  PublisherHook,
} from '../../../contracts/index.js';

import { PublisherHookPipeline } from '../PublisherHookPipeline.js';

export class InMemoryEventBus {
  private readonly handlers = new Map<
    string,
    MessageHandler<DomainEvent, void>[]
  >();

  private readonly publisherHookPipeline: PublisherHookPipeline;

  constructor(
    private readonly context: HandlerContext,
    publisherHooks: readonly PublisherHook[] = [],
  ) {
    this.publisherHookPipeline = new PublisherHookPipeline(publisherHooks);
  }

  public subscribe<TEvent extends DomainEvent>(
    name: TEvent['name'],
    handler: MessageHandler<TEvent, void>,
  ): void {
    const handlers = this.handlers.get(name) ?? [];

    handlers.push(handler as MessageHandler<DomainEvent, void>);
    this.handlers.set(name, handlers);
  }

  public async publish<TEvent extends DomainEvent>(
    event: TEvent,
  ): Promise<void> {
    const handlers = this.handlers.get(event.name) ?? [];

    await this.publisherHookPipeline.run(
      { message: event, metadata: event.metadata ?? {}, topic: event.name },
      async () => {
        for (const handler of handlers) {
          await handler(event, this.context);
        }
      },
    );
  }

  public registerPublisherHooks(...hooks: PublisherHook[]): void {
    this.publisherHookPipeline.register(...hooks);
  }
}
