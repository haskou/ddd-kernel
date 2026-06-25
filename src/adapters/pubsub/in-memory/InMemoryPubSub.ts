import type {
  HandlerContext,
  Message,
  MessageHandler,
  PublisherHook,
  Subscription,
} from '../../../contracts/index.js';

import { PublisherHookPipeline } from '../PublisherHookPipeline.js';

export class InMemoryPubSub {
  private readonly consumers = new Map<
    string,
    Set<MessageHandler<Message, void>>
  >();

  private readonly publisherHookPipeline: PublisherHookPipeline;

  constructor(
    private readonly context: HandlerContext,
    publisherHooks: readonly PublisherHook[] = [],
  ) {
    this.publisherHookPipeline = new PublisherHookPipeline(publisherHooks);
  }

  public async publish<TMessage extends Message>(
    topic: string,
    message: TMessage,
  ): Promise<void> {
    const consumers = this.consumers.get(topic) ?? new Set();

    await this.publisherHookPipeline.run(
      { message, metadata: message.metadata ?? {}, topic },
      async () => {
        for (const consumer of consumers) {
          await consumer(message, this.context);
        }
      },
    );
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

  public registerPublisherHooks(...hooks: PublisherHook[]): void {
    this.publisherHookPipeline.register(...hooks);
  }
}
