# Installation

Install the kernel package in an application:

```bash
yarn add @haskou/ddd-kernel
```

That is enough for the core kernel, contracts, domain primitives, dependency
injection and in-memory adapters.

Install extra packages only for the adapters your application imports.

## Pub/Sub Adapters

The in-memory pub/sub adapter has no extra runtime dependencies.

The AMQP adapter uses `amqplib`:

```bash
yarn add amqplib
```

## DB Adapters

The in-memory repository adapter has no extra runtime dependencies.

The MongoDB repository adapter uses `mongodb`:

```bash
yarn add mongodb
```

## UI Adapters

The Express adapter uses `express`, `routing-controllers` and decorator
metadata packages:

```bash
yarn add express routing-controllers reflect-metadata class-transformer class-validator
```

Install `cors` only when enabling `routingControllersOptions.cors`:

```bash
yarn add cors
```

## Other Adapters

Schedulers use `node-cron`:

```bash
yarn add node-cron
```

The Winston logger uses `winston`:

```bash
yarn add winston
```

WebSocket helpers use `ws`:

```bash
yarn add ws
```

## TypeScript Resolution

The package publishes ESM, CommonJS and declaration files for every public
subpath. Modern projects should prefer `moduleResolution: "NodeNext"` or
`"Bundler"`, but declaration mappings are also provided for projects still using
classic `moduleResolution: "node"`.
