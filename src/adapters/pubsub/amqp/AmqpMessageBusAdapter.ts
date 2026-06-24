import amqplib, {
  type Channel,
  type ChannelModel,
  type ConsumeMessage,
  type GetMessage,
  type MessagePropertyHeaders,
  type Options,
} from 'amqplib';
import { randomUUID } from 'node:crypto';

import type {
  Constructor,
  DomainEvent,
  DomainEventConsumer,
  DomainEventPublisher,
} from '../../../domain/index.js';
import type { AmqpMessage } from './AmqpMessage.js';
import type { AmqpMessageBusAdapterOptions } from './AmqpMessageBusAdapterOptions.js';
import type { ConsumerContext } from './ConsumerContext.js';

import { Kernel } from '../../../Kernel.js';
import { InvalidDomainEventError } from './InvalidDomainEventError.js';
import { NoFailedMessagesError } from './NoFailedMessagesError.js';

export default class AmqpMessageBusAdapter
  implements DomainEventConsumer, DomainEventPublisher
{
  private channelInstance: Channel | undefined;
  private connection: ChannelModel | undefined;
  private readonly delayConsumers: string[] = [];
  private exchange: string;

  constructor(private readonly options: AmqpMessageBusAdapterOptions = {}) {
    this.exchange =
      options.exchange ?? options.serviceName ?? process.env.SERVICE_NAME ?? '';
  }

  private get dsn(): string {
    return this.options.dsn ?? process.env.TRANSPORT_DSN ?? '';
  }

  private get logger(): AmqpMessageBusAdapterOptions['logger'] {
    return this.options.logger ?? Kernel.logger;
  }

  private get maxRetries(): number | undefined {
    const configuredRetries =
      this.options.maxRetries ?? process.env.TRANSPORT_MAX_RETRIES;

    if (configuredRetries === undefined) {
      return undefined;
    }

    return Number(configuredRetries);
  }

  private get retryDelayInMilliseconds(): number {
    const retryDelayFromEnv = Number(process.env.TRANSPORT_RETRY_DELAY);

    return (
      this.options.retryDelayInMilliseconds ??
      (Number.isFinite(retryDelayFromEnv) ? retryDelayFromEnv : 1000)
    );
  }

  private instanceDomainEvent(
    DomainEventInstance: Constructor<DomainEvent>,
    message: AmqpMessage,
  ): DomainEvent {
    if (!message) {
      throw new InvalidDomainEventError(JSON.stringify(message));
    }

    return new DomainEventInstance(
      message.aggregate_id,
      message.attributes,
      message.event_id,
      message.occurred_on ? new Date(message.occurred_on) : new Date(),
      message.correlation_id,
      message.causation_id,
    );
  }

  private async handle(
    msg: ConsumeMessage,
    context: ConsumerContext,
  ): Promise<void> {
    const message = JSON.parse(msg.content.toString()) as AmqpMessage;

    this.logger?.info(
      `AMQP message bus (${context.queueName}) handling message: ${JSON.stringify(message)}`,
    );

    try {
      const domainEvent = this.instanceDomainEvent(
        context.DomainEventInstance,
        message,
      );

      await context.handler(domainEvent);
    } catch (error) {
      await this.handleError(msg, message, context, error);
    }
  }

  private async handleError(
    msg: ConsumeMessage,
    message: AmqpMessage,
    context: ConsumerContext,
    error: unknown,
  ): Promise<void> {
    this.logger?.error(error instanceof Error ? error.message : String(error));
    const headers = msg.properties.headers ?? {};
    const retryCount = Number(headers.retries ?? 0);

    if (this.maxRetries !== undefined && retryCount <= this.maxRetries) {
      await this.retry(message, headers, context);

      return;
    }

    await this.sendToDlx(message, context, String(error));
  }

  private async retry(
    message: AmqpMessage,
    headers: MessagePropertyHeaders,
    context: ConsumerContext,
  ): Promise<void> {
    const retry = Number(headers.retries || 1);
    const delayTimeInMs = retry * this.retryDelayInMilliseconds;
    const delayedQueueName = `${context.queueName}_delayed_${delayTimeInMs}`;
    const delayedRoutingKey = `${context.queueName}_${context.bindingKey}_delayed_${delayTimeInMs}`;
    const consumerTag = `${delayedQueueName}_${randomUUID()}`;

    this.logger?.info(`Retry # ${retry}`);

    if (!this.delayConsumers.includes(delayedQueueName)) {
      await this.registerDelayedConsumer(
        delayedQueueName,
        delayedRoutingKey,
        delayTimeInMs,
        consumerTag,
        context,
      );
    }

    try {
      const domainEvent = this.instanceDomainEvent(
        context.DomainEventInstance,
        message,
      );

      context.channel.publish(
        this.exchange,
        delayedRoutingKey,
        Buffer.from(JSON.stringify(message)),
        this.opts(domainEvent, retry),
      );
    } catch (error: unknown) {
      await context.channel.cancel(consumerTag);
      this.logger?.error(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async registerDelayedConsumer(
    delayedQueueName: string,
    delayedRoutingKey: string,
    delayTimeInMs: number,
    consumerTag: string,
    context: ConsumerContext,
  ): Promise<void> {
    await context.channel.assertExchange(this.exchange, 'topic', {
      durable: true,
    });
    await context.channel.assertQueue(delayedQueueName, {
      autoDelete: true,
      deadLetterExchange: this.exchange,
      deadLetterRoutingKey: delayedRoutingKey,
      durable: false,
      messageTtl: delayTimeInMs,
    });
    await context.channel.bindQueue(
      delayedQueueName,
      this.exchange,
      delayedRoutingKey,
    );
    this.delayConsumers.push(delayedQueueName);
    await context.channel.consume(
      delayedQueueName,
      async (msg: ConsumeMessage | null) => {
        if (!msg) {
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, delayTimeInMs));
        await this.handle(msg, context);
        this.removeDelayConsumer(delayedQueueName);
        await context.channel.cancel(consumerTag);
      },
      { consumerTag, noAck: true },
    );
  }

  private removeDelayConsumer(delayedQueueName: string): void {
    const index = this.delayConsumers.indexOf(delayedQueueName);

    if (index !== -1) {
      this.delayConsumers.splice(index, 1);
    }
  }

  private async sendToDlx(
    message: AmqpMessage,
    context: ConsumerContext,
    error?: string,
  ): Promise<void> {
    await context.channel.assertExchange(this.exchange, 'topic');
    const dlxQueueName = `${context.queueName}_dlx`;
    const dlxRoutingKey = `${context.queueName}_${context.bindingKey}_dlx`;

    await context.channel.assertQueue(dlxQueueName, {
      deadLetterExchange: this.exchange,
      deadLetterRoutingKey: dlxRoutingKey,
      durable: true,
    });
    await context.channel.bindQueue(dlxQueueName, this.exchange, dlxRoutingKey);

    try {
      const domainEvent = this.instanceDomainEvent(
        context.DomainEventInstance,
        message,
      );

      context.channel.publish(
        this.exchange,
        dlxRoutingKey,
        Buffer.from(JSON.stringify(message)),
        this.opts(domainEvent, message.retries, error),
      );
    } catch (publishError: unknown) {
      this.logger?.error(
        publishError instanceof Error
          ? publishError.message
          : String(publishError),
      );
    }
  }

  private async connect(): Promise<void> {
    this.connection = await amqplib.connect(this.getConnectionDsn());
    this.channelInstance = await this.connection.createChannel();
    this.channelInstance
      .on('close', async () => {
        this.logger?.error('AMQP message bus event close');
        await this.reconnect();
      })
      .on('error', async (error) => {
        this.logger?.error(`AMQP message bus event error: ${error.message}`);
        await this.reconnect();
      });
  }

  private async reconnect(): Promise<void> {
    await this.connect();

    for (const consumer of Kernel.consumers) {
      await consumer.init();
    }
  }

  private async channel(forceNew = false): Promise<Channel> {
    if (forceNew) {
      const connection = await amqplib.connect(this.getConnectionDsn());

      return connection.createChannel();
    }

    if (!this.channelInstance) {
      await this.connect();
    }

    if (!this.channelInstance) {
      throw new Error('AMQP channel could not be created.');
    }

    await this.channelInstance.assertExchange(this.exchange, 'topic', {
      durable: true,
    });

    return this.channelInstance;
  }

  private getConnectionDsn(): string {
    const separator = this.dsn.includes('?') ? '&' : '?';

    return `${this.dsn}${separator}heartbeat=60`;
  }

  private opts(
    event: DomainEvent,
    retries?: number,
    error?: string,
  ): Options.Publish {
    return {
      appId: this.options.serviceName ?? process.env.SERVICE_NAME,
      contentEncoding: 'utf-8',
      contentType: 'application/json',
      deliveryMode: 2,
      headers: {
        error,
        retries: retries ? retries + 1 : 0,
      },
      messageId: event.eventId,
      priority: 0,
      timestamp: event.occurredOn.getTime(),
      type: event.eventName(),
    };
  }

  private getMessagesToRetry(
    requestedMessagesToRetry: number | undefined,
    availableMessages: number,
  ): number {
    return requestedMessagesToRetry ?? availableMessages;
  }

  private async retryDlxMessage(
    msg: ConsumeMessage | GetMessage,
    DomainEventInstance: Constructor<DomainEvent>,
    handler: (event: DomainEvent) => Promise<void>,
    channel: Channel,
  ): Promise<void> {
    const content = msg.content.toString();

    this.logger?.info(`Retrying message from DLX ${content}`);

    try {
      const message = JSON.parse(content) as AmqpMessage;
      const domainEvent = this.instanceDomainEvent(
        DomainEventInstance,
        message,
      );

      await handler(domainEvent);
      this.logger?.info(`${content} successfully handled.`);
      channel.ack(msg);
    } catch (error: Error | unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger?.error(`${content} error with ${errorMessage}.`);
      channel.nack(msg);
    }
  }

  public async areQueuesBound(): Promise<boolean> {
    if (Kernel.consumers.length === 0) {
      return false;
    }

    const channel = await this.channel();

    for (const consumer of Kernel.consumers) {
      const queueChecker = await channel.checkQueue(consumer.queueName);

      if (queueChecker.consumerCount !== 0) {
        return false;
      }
    }

    return true;
  }

  public async consumeDlx(
    queueName: string,
    DomainEventInstance: Constructor<DomainEvent>,
    handler: (event: DomainEvent) => Promise<void>,
    messagesToRetry?: number,
  ): Promise<void> {
    const dlxQueueName = `${queueName}_dlx`;
    const channel = await this.channel(true);

    channel.on('error', () => {
      this.logger?.error('AMQP message bus event error');
    });

    const queue = await channel.checkQueue(dlxQueueName);
    const messagesToRetryCount = this.getMessagesToRetry(
      messagesToRetry,
      queue.messageCount,
    );

    this.logger?.info(
      `Retrying ${messagesToRetryCount} messages from DLX ${dlxQueueName}`,
    );

    if (messagesToRetryCount > 0 && queue.messageCount !== 0) {
      for (let index = 0; index < messagesToRetryCount; index++) {
        const msg = await channel.get(dlxQueueName);

        if (msg === false) {
          continue;
        }

        await this.retryDlxMessage(msg, DomainEventInstance, handler, channel);
      }

      return;
    }

    throw new NoFailedMessagesError(dlxQueueName);
  }

  public async consume(
    queueName: string,
    bindingKey: string,
    DomainEventInstance: Constructor<DomainEvent>,
    exchange: string,
    handler: (event: DomainEvent) => Promise<void>,
  ): Promise<void> {
    const channel = await this.channel();

    await channel.assertQueue(queueName, { durable: true });
    await channel.assertExchange(exchange, 'topic');
    await channel.prefetch(1);
    await channel.bindQueue(queueName, exchange, bindingKey);

    const context: ConsumerContext = {
      bindingKey,
      channel,
      DomainEventInstance,
      handler,
      queueName,
    };

    await channel.consume(queueName, async (msg: ConsumeMessage | null) => {
      if (!msg) {
        return;
      }

      await this.handle(msg, context);
      channel.ack(msg);
    });
  }

  public async publish(domainEvents: DomainEvent[]): Promise<void> {
    const channel = await this.channel();

    for (const event of domainEvents) {
      channel.publish(
        this.exchange,
        event.eventName(),
        Buffer.from(event.decode()),
        this.opts(event),
      );
    }
  }

  public async close(): Promise<void> {
    await this.channelInstance?.close();
    await this.connection?.close();
    this.channelInstance = undefined;
    this.connection = undefined;
  }
}
