import type {
  DomainEvent,
  HandlerContext,
  MessageHandler,
} from '../../../contracts/index.js';

export class InMemoryEventBus {
  private readonly handlers = new Map<
    string,
    MessageHandler<DomainEvent, void>[]
  >();

  constructor(private readonly context: HandlerContext) {}

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

    for (const handler of handlers) {
      await handler(event, this.context);
    }
  }
}
