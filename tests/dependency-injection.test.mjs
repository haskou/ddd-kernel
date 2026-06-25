import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

import { DependencyInjection } from '../dist/infrastructure/dependency-injection/index.js';

class ContractRepository {}

class ConcreteRepository extends ContractRepository {}

class InMemoryRepository extends ContractRepository {}

class MongoRepository extends ContractRepository {}

class AliasRepository {}

class ConcreteService {}

const serviceIdFor = (ClassDefinition) =>
  Buffer.from(
    `${ClassDefinition.name}.ts__${ClassDefinition.name}__${ClassDefinition.name}`,
  ).toString('base64');

test('resolves a concrete class registered in the container', async () => {
  const dependencyInjection = new DependencyInjection();
  const serviceId = serviceIdFor(ConcreteService);

  dependencyInjection.container.register(serviceId, ConcreteService);
  await dependencyInjection.container.compile();

  const service = dependencyInjection.getService(ConcreteService);

  assert.ok(service instanceof ConcreteService);
});

test('resolves an abstract parent to its concrete implementation', async () => {
  const dependencyInjection = new DependencyInjection();
  const parentId = serviceIdFor(ContractRepository);
  const childId = serviceIdFor(ConcreteRepository);

  const parentDefinition = dependencyInjection.container.register(
    parentId,
    ContractRepository,
  );
  parentDefinition.abstract = true;
  dependencyInjection.container.register(childId, ConcreteRepository).parent =
    parentId;

  await dependencyInjection.container.compile();

  const repository = dependencyInjection.getService(ContractRepository);

  assert.ok(repository instanceof ConcreteRepository);
});

test('resolves an alias to its target implementation', async () => {
  const dependencyInjection = new DependencyInjection();
  const aliasId = serviceIdFor(AliasRepository);
  const targetId = serviceIdFor(ConcreteRepository);

  dependencyInjection.container.register(targetId, ConcreteRepository);
  dependencyInjection.container.setAlias(aliasId, targetId);

  await dependencyInjection.container.compile();

  const repository = dependencyInjection.getService(AliasRepository);

  assert.ok(repository instanceof ConcreteRepository);
});

test('overrides an abstract parent with another registered implementation', async () => {
  const dependencyInjection = new DependencyInjection({
    containerBuild: true,
    overrides: [
      {
        token: ContractRepository,
        useClass: InMemoryRepository,
      },
    ],
    servicesYamlPath: '/tmp/services.yaml',
    sourceDirectory: process.cwd(),
  });
  const parentId = serviceIdFor(ContractRepository);
  const mongoId = serviceIdFor(MongoRepository);
  const inMemoryId = serviceIdFor(InMemoryRepository);

  dependencyInjection.container.register(
    parentId,
    ContractRepository,
  ).abstract = true;
  dependencyInjection.container.register(mongoId, MongoRepository).parent =
    parentId;
  dependencyInjection.container.register(
    inMemoryId,
    InMemoryRepository,
  ).parent = parentId;
  dependencyInjection.registerParentAliases();
  dependencyInjection.applyOverrides();
  await dependencyInjection.container.compile();

  const repository = dependencyInjection.getService(ContractRepository);

  assert.ok(repository instanceof InMemoryRepository);
});

test('overrides a service with a value instance', async () => {
  const repository = new InMemoryRepository();
  const dependencyInjection = new DependencyInjection({
    containerBuild: true,
    overrides: [
      {
        token: ContractRepository,
        useValue: repository,
      },
    ],
    servicesYamlPath: '/tmp/services.yaml',
    sourceDirectory: process.cwd(),
  });
  const parentId = serviceIdFor(ContractRepository);
  const mongoId = serviceIdFor(MongoRepository);

  dependencyInjection.container.register(
    parentId,
    ContractRepository,
  ).abstract = true;
  dependencyInjection.container.register(mongoId, MongoRepository).parent =
    parentId;
  dependencyInjection.registerParentAliases();
  dependencyInjection.applyOverrides();
  await dependencyInjection.container.compile();

  assert.equal(dependencyInjection.getService(ContractRepository), repository);
});

test('overrides a service with a factory result', async () => {
  const repository = new InMemoryRepository();
  const dependencyInjection = new DependencyInjection({
    containerBuild: true,
    overrides: [
      {
        token: ContractRepository,
        useFactory: () => repository,
      },
    ],
    servicesYamlPath: '/tmp/services.yaml',
    sourceDirectory: process.cwd(),
  });
  const parentId = serviceIdFor(ContractRepository);
  const mongoId = serviceIdFor(MongoRepository);

  dependencyInjection.container.register(
    parentId,
    ContractRepository,
  ).abstract = true;
  dependencyInjection.container.register(mongoId, MongoRepository).parent =
    parentId;
  dependencyInjection.registerParentAliases();
  dependencyInjection.applyOverrides();
  await dependencyInjection.container.compile();

  assert.equal(dependencyInjection.getService(ContractRepository), repository);
});

test('overrides an alias token with a value instance', async () => {
  const repository = new InMemoryRepository();
  const dependencyInjection = new DependencyInjection({
    containerBuild: true,
    overrides: [
      {
        token: AliasRepository,
        useValue: repository,
      },
    ],
    servicesYamlPath: '/tmp/services.yaml',
    sourceDirectory: process.cwd(),
  });
  const aliasId = serviceIdFor(AliasRepository);
  const mongoId = serviceIdFor(MongoRepository);

  dependencyInjection.container.register(mongoId, MongoRepository);
  dependencyInjection.container.setAlias(aliasId, mongoId);
  dependencyInjection.applyOverrides();
  await dependencyInjection.container.compile();

  assert.equal(dependencyInjection.getService(AliasRepository), repository);
});

test('overrides a token that is not registered in the container', async () => {
  class ExternalRepository {}

  const repository = new ExternalRepository();
  const dependencyInjection = new DependencyInjection({
    containerBuild: true,
    overrides: [
      {
        token: ExternalRepository,
        useValue: repository,
      },
    ],
    servicesYamlPath: '/tmp/services.yaml',
    sourceDirectory: process.cwd(),
  });

  dependencyInjection.applyOverrides();
  await dependencyInjection.container.compile();

  assert.equal(dependencyInjection.getService(ExternalRepository), repository);
});

test('registers override classes that are not already in the container', async () => {
  class ExternalRepository extends ContractRepository {}

  const dependencyInjection = new DependencyInjection({
    containerBuild: true,
    overrides: [
      {
        token: ContractRepository,
        useClass: ExternalRepository,
      },
    ],
    servicesYamlPath: '/tmp/services.yaml',
    sourceDirectory: process.cwd(),
  });
  const parentId = serviceIdFor(ContractRepository);
  const mongoId = serviceIdFor(MongoRepository);

  dependencyInjection.container.register(
    parentId,
    ContractRepository,
  ).abstract = true;
  dependencyInjection.container.register(mongoId, MongoRepository).parent =
    parentId;
  dependencyInjection.registerParentAliases();
  dependencyInjection.applyOverrides();
  await dependencyInjection.container.compile();

  assert.ok(
    dependencyInjection.getService(ContractRepository) instanceof
      ExternalRepository,
  );
});

test('generates services.yaml', async () => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'ddd-kernel-'));
  const sourceDirectory = temporaryDirectory;
  const servicesYamlPath = path.join(
    temporaryDirectory,
    'config',
    'container',
    'services.yaml',
  );

  await writeFile(
    path.join(sourceDirectory, 'GeneratedRepository.ts'),
    'export default class GeneratedRepository {}\n',
  );

  const builderDependencyInjection = DependencyInjection.configure({
    containerBuild: true,
    servicesYamlPath,
    sourceDirectory,
  });

  await builderDependencyInjection.compile();

  const servicesYaml = await readFile(servicesYamlPath, 'utf8');

  assert.match(servicesYaml, /GeneratedRepository/);
});

test('reads services.yaml', async () => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'ddd-kernel-'));
  const loadedRepositoryPath = path.join(
    temporaryDirectory,
    'LoadedRepository.cjs',
  );
  const servicesYamlPath = path.join(temporaryDirectory, 'services.yaml');
  const serviceId = Buffer.from(
    'LoadedRepository.cjs__LoadedRepository__LoadedRepository',
  ).toString('base64');

  await writeFile(
    loadedRepositoryPath,
    'module.exports = class LoadedRepository {};\n',
  );
  await writeFile(
    servicesYamlPath,
    [
      'services:',
      `  ${serviceId}:`,
      `    class: ${loadedRepositoryPath}`,
      '    arguments: []',
      '    abstract: false',
      '    parent: null',
      '',
    ].join('\n'),
  );

  const LoadedRepository = (await import(pathToFileURL(loadedRepositoryPath)))
    .default;

  const loaderDependencyInjection = DependencyInjection.configure({
    containerBuild: false,
    servicesYamlPath,
    sourceDirectory: temporaryDirectory,
  });

  await loaderDependencyInjection.compile();

  assert.ok(
    loaderDependencyInjection.getService(LoadedRepository) instanceof
      LoadedRepository,
  );
});

test('throws when singleton instance is requested before configuration', () => {
  const previousInstance = DependencyInjection.configuredInstance;

  DependencyInjection.configuredInstance = undefined;

  try {
    assert.throws(
      () => DependencyInjection.instance,
      /DependencyInjection has not been configured/,
    );
  } finally {
    DependencyInjection.configuredInstance = previousInstance;
  }
});

test('returns the configured singleton instance', () => {
  const dependencyInjection = DependencyInjection.configure({
    containerBuild: true,
    servicesYamlPath: '/tmp/services.yaml',
    sourceDirectory: process.cwd(),
  });

  assert.equal(DependencyInjection.instance, dependencyInjection);
});

test('falls back to empty definition and alias maps when container internals are missing', () => {
  const dependencyInjection = new DependencyInjection();
  const previousDefinitions = dependencyInjection.container._definitions;
  const previousAliases = dependencyInjection.container._alias;

  dependencyInjection.container._definitions = undefined;
  dependencyInjection.container._alias = undefined;

  try {
    assert.deepEqual([...dependencyInjection.definitions.entries()], []);
    assert.deepEqual([...dependencyInjection.aliases.entries()], []);
  } finally {
    dependencyInjection.container._definitions = previousDefinitions;
    dependencyInjection.container._alias = previousAliases;
  }
});

test('falls back to literal container ids when service name is not a class', async () => {
  class ParentService {}

  class LiteralService extends ParentService {}

  const dependencyInjection = new DependencyInjection();
  const parentServiceId = serviceIdFor(ParentService);
  const literalServiceId = serviceIdFor(LiteralService);

  dependencyInjection.container.register('literal-service', LiteralService);
  dependencyInjection.container.register(
    parentServiceId,
    ParentService,
  ).abstract = true;
  dependencyInjection.container.register(
    literalServiceId,
    LiteralService,
  ).parent = parentServiceId;
  dependencyInjection.container.register(
    'abstract-service',
    LiteralService,
  ).abstract = true;
  dependencyInjection.container.register('parentless-service', LiteralService);
  dependencyInjection.registerParentAliases();
  await dependencyInjection.container.compile();

  assert.ok(
    dependencyInjection.getService('literal-service') instanceof LiteralService,
  );
  assert.ok(
    dependencyInjection.getService(ParentService) instanceof LiteralService,
  );
});
