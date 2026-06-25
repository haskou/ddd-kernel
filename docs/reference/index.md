# Reference

Reference pages are grouped by the layer they belong to.

## Kernel

- [Kernel](/reference/kernel): application runtime, lifecycle and registration
  API.
- [DependencyInjection](/reference/dependency-injection): DI container setup,
  container build mode and overrides.
- [ConsoleKernelLogger](/reference/console-kernel-logger): default
  `KernelLogger` implementation.

## Contracts And Domain

- [AggregateRoot](/reference/aggregate-root)
- [DomainEvent](/reference/domain-event)
- [DomainEventConsumer](/reference/domain-event-consumer)
- [DomainEventPublisher](/reference/domain-event-publisher)

## Pub/Sub

- [Consumer](/reference/consumer): base class for application consumers.
- [InMemoryPubSub](/reference/in-memory-pub-sub): in-memory pub/sub adapter.
- [AmqpMessageBusAdapter](/reference/amqp-message-bus-adapter): AMQP
  domain-event adapter.

## DB

- [InMemoryRepository](/reference/in-memory-repository)
- [MongoRepository](/reference/mongo-repository)

## UI

- [ExpressKernelServer](/reference/express-kernel-server)
- [Route](/reference/route)

## Scheduling, Logs And WebSocket

- [Scheduler](/reference/scheduler)
- [WinstonLogger](/reference/winston-logger)
- [WebSocketEventHub](/reference/web-socket-event-hub)
- [WebSocketRealtimeServer](/reference/web-socket-realtime-server)
