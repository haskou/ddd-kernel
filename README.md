# @haskou/ddd-kernel

[![CI](https://github.com/haskou/ddd-kernel/actions/workflows/ci.yml/badge.svg)](https://github.com/haskou/ddd-kernel/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/haskou/ddd-kernel/branch/main/graph/badge.svg)](https://codecov.io/gh/haskou/ddd-kernel)
[![npm](https://img.shields.io/npm/v/@haskou/ddd-kernel.svg)](https://www.npmjs.com/package/@haskou/ddd-kernel)
[![license](https://img.shields.io/npm/l/@haskou/ddd-kernel.svg)](LICENSE)

Framework-agnostic DDD kernel for TypeScript applications and microservices.

`@haskou/ddd-kernel` provides the runtime foundation shared by services that
are built around aggregates, domain events, consumers, schedulers and explicit
composition roots. The package keeps application bootstrapping consistent while
leaving transport, persistence and logging choices behind replaceable adapters.

## Scope

The core package is responsible for application lifecycle and dependency
composition. It includes contracts and primitives for:

- dependency injection and service resolution
- startup and graceful shutdown hooks
- consumers and consumer middleware
- schedulers and scheduler error policies
- runtimes
- domain events and aggregate roots
- repositories and pub/sub contracts
- logging contracts

The kernel does not own HTTP, AMQP, MongoDB, WebSocket or logger implementation
details. Those integrations are exposed as optional adapters, so applications
only depend on the infrastructure they actually use.

## Architecture

The package separates stable contracts from concrete infrastructure:

- `@haskou/ddd-kernel` contains the kernel, lifecycle, DI integration and domain
  primitives.
- `@haskou/ddd-kernel/adapters/*` contains optional adapter entrypoints.
- Applications register their own consumers, schedulers, runtimes and adapters
  at the composition root.

Constructor injection is the preferred application pattern. Direct service
lookup remains available for compatibility and integration boundaries, but it is
not the primary dependency model.

## Documentation

Usage guides, adapter authoring notes and API reference pages are published at:

https://haskou.github.io/ddd-kernel/

The README is intentionally limited to project orientation. Installation,
startup, DI, AMQP, routes and adapter examples live in the documentation site.

## Release Branches

CI publishes npm versions from pull requests merged into the default branch
according to the source branch prefix:

| Branch prefix | npm version bump |
| --- | --- |
| `fix/*` | Patch |
| `feat/*` | Minor |
| `break/*` | Major |

Other branch names run validation only and do not publish.

## License

MIT. See [LICENSE](LICENSE).
