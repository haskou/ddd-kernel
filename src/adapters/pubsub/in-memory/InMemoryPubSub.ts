import type {
  HandlerContext,
  Message,
  MessageHandler,
  Subscription,
} from '../../../contracts/index.js';

export class InMemoryPubSub {
  private readonly consumers = new Map<
    string,
    Set<MessageHandler<Message, void>>
  >();

  constructor(private readonly context: HandlerContext) {}

  public async publish<TMessage extends Message>(
    topic: string,
    message: TMessage,
  ): Promise<void> {
    const consumers = this.consumers.get(topic) ?? new Set();

    for (const consumer of consumers) {
      await consumer(message, this.context);
    }
  }

  public subscribe<TMessage extends Message>(
    topic: string,
    consumer: MessageHandler<TMessage, void>,
  ): Promise<Subscription> {
    const consumers =
      this.consumers.get(topic) ?? new Set<MessageHandler<Message, void>>();
    const castConsumer = consumer as MessageHandler<Message, void>;

    consumers.add(castConsumer);
    this.consumers.set(topic, consumers);

    return Promise.resolve({
      close: () => {
        consumers.delete(castConsumer);

        return Promise.resolve();
      },
    });
  }
}
