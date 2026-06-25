# Introduction

The kernel is a composition runtime for DDD applications. It does not ask you to
manually register factories for every class. Instead, application services,
repositories, routes, consumers, schedulers and runtimes are default-exported
classes resolved by `node-dependency-injection`.

Use it when you want:

- A common bootstrap flow for services.
- Domain event publishing and consuming.
- Optional adapters for AMQP, MongoDB, Express, WebSocket and logging.
- A predictable folder split between contracts, domain, adapters and
  infrastructure.

The core package does not force a database or HTTP framework into your app. Use
adapter subpaths only when a service needs them.

The recommended dependency direction is:

1. Domain and application code depend on contracts and domain primitives.
2. Adapters implement those contracts at the infrastructure boundary.
3. Bootstrap code chooses the adapter for the current runtime.

For the available imports and adapters, see the
[package map](/getting-started/package-map).
