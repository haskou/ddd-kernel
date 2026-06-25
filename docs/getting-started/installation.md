# Installation

Install the package in an application:

```bash
yarn add @haskou/ddd-kernel
```

Install only the peer dependencies required by the adapters you import. For
example, AMQP requires `amqplib`:

```bash
yarn add amqplib
```

Express routes require:

```bash
yarn add express routing-controllers reflect-metadata class-transformer class-validator
```

MongoDB repositories require:

```bash
yarn add mongodb
```

## TypeScript Resolution

The package publishes ESM, CommonJS and declaration files for every public
subpath. Modern projects should prefer `moduleResolution: "NodeNext"` or
`"Bundler"`, but declaration mappings are also provided for projects still using
classic `moduleResolution: "node"`.
