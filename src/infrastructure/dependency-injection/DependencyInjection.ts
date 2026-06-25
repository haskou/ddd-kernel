import fs from 'fs-extra';
import {
  Autowire,
  ContainerBuilder,
  ServiceFile,
  YamlFileLoader,
} from 'node-dependency-injection';
import path from 'node:path';

import type { ServiceResolver } from '../../contracts/index.js';
import type { ContainerInternals } from './ContainerInternals.js';
import type { DefinitionMetadata } from './DefinitionMetadata.js';
import type { DependencyInjectionOptions } from './DependencyInjectionOptions.js';
import type { DependencyOverride } from './DependencyOverride.js';

export class DependencyInjection implements ServiceResolver {
  private static configuredInstance: DependencyInjection | undefined;
  private autowire: Autowire | undefined;
  private loader: YamlFileLoader | undefined;
  private readonly container: ContainerBuilder;
  private readonly overrideTokenIds = new Map<unknown, string>();

  public static configure(
    options: DependencyInjectionOptions,
  ): DependencyInjection {
    DependencyInjection.configuredInstance = new DependencyInjection(options);

    return DependencyInjection.configuredInstance;
  }

  public static get instance(): DependencyInjection {
    if (!DependencyInjection.configuredInstance) {
      throw new Error('DependencyInjection has not been configured.');
    }

    return DependencyInjection.configuredInstance;
  }

  constructor(
    private readonly options: DependencyInjectionOptions = {
      containerBuild: process.env.CONTAINER_BUILD === 'true',
      servicesYamlPath: path.resolve(
        process.cwd(),
        'config',
        'container',
        'services.yaml',
      ),
      sourceDirectory: path.resolve(process.cwd(), 'src'),
    },
  ) {
    this.container = new ContainerBuilder(false, this.options.sourceDirectory);
  }

  private get definitions(): Map<string, DefinitionMetadata> {
    const container = this.container as unknown as ContainerInternals;

    return container._definitions || new Map();
  }

  private get aliases(): Map<string, string> {
    const container = this.container as unknown as ContainerInternals;

    return container._alias || new Map();
  }

  private async ensureFolderExists(filePath: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  }

  private getServiceClassName(serviceName: unknown): string | undefined {
    return typeof serviceName === 'function' ? serviceName.name : undefined;
  }

  private getOverrideId(prefix: string, token: unknown): string {
    const tokenName = this.getServiceClassName(token) ?? String(token);

    return `ddd-kernel.override.${prefix}.${tokenName}`;
  }

  private ensureSyntheticService(id: string, value: unknown): void {
    const definition = this.container.register(id);

    definition.public = true;
    definition.synthetic = true;
    this.container.set(id, value);
  }

  private parentMatchesService(
    parentId: string | null | undefined,
    serviceClassName: string,
  ): boolean {
    if (!parentId) {
      return false;
    }

    const parentName = Buffer.from(parentId, 'base64').toString('utf8');

    return parentName.endsWith(`__${serviceClassName}__${serviceClassName}`);
  }

  private serviceIdMatchesService(
    serviceId: string,
    serviceClassName: string,
  ): boolean {
    const serviceName = Buffer.from(serviceId, 'base64').toString('utf8');

    return serviceName.endsWith(`__${serviceClassName}__${serviceClassName}`);
  }

  private findConcreteChildServiceId(serviceName: unknown): string | undefined {
    const serviceClassName = this.getServiceClassName(serviceName);

    if (!serviceClassName) {
      return undefined;
    }

    const matches = [...this.definitions.entries()]
      .filter(([, definition]) => definition._abstract !== true)
      .filter(([, definition]) =>
        this.parentMatchesService(definition._parent, serviceClassName),
      )
      .map(([id]) => id);

    return matches[matches.length - 1];
  }

  private findRegisteredServiceId(serviceName: unknown): string | undefined {
    const serviceClassName = this.getServiceClassName(serviceName);

    if (!serviceClassName) {
      return undefined;
    }

    const matches = [...this.definitions.keys()].filter((id) =>
      this.serviceIdMatchesService(id, serviceClassName),
    );

    return matches[matches.length - 1];
  }

  private findAliasServiceId(serviceName: unknown): string | undefined {
    const serviceClassName = this.getServiceClassName(serviceName);

    if (!serviceClassName) {
      return undefined;
    }

    const matches = [...this.aliases.keys()].filter((id) =>
      this.serviceIdMatchesService(id, serviceClassName),
    );

    return matches[matches.length - 1];
  }

  private getOverrideTokenId(token: unknown): string {
    const registeredServiceId = this.findRegisteredServiceId(token);

    if (registeredServiceId) {
      return registeredServiceId;
    }

    const aliasServiceId = this.findAliasServiceId(token);

    if (aliasServiceId) {
      return aliasServiceId;
    }

    const overrideTokenId = this.getOverrideId('token', token);

    this.ensureSyntheticService(overrideTokenId, undefined);

    return overrideTokenId;
  }

  private getOverrideClassServiceId(
    ClassDefinition: new () => unknown,
  ): string {
    const registeredServiceId = this.findRegisteredServiceId(ClassDefinition);

    if (registeredServiceId) {
      return registeredServiceId;
    }

    const overrideClassId = this.getOverrideId('class', ClassDefinition);

    this.container.register(overrideClassId, ClassDefinition);

    return overrideClassId;
  }

  private applyClassOverride(override: DependencyOverride): void {
    if (!('useClass' in override)) {
      return;
    }

    const tokenId = this.getOverrideTokenId(override.token);
    const classId = this.getOverrideClassServiceId(override.useClass);

    this.overrideTokenIds.set(override.token, tokenId);
    this.container.setAlias(tokenId, classId);
  }

  private applyFactoryOverride(override: DependencyOverride): void {
    if (!('useFactory' in override)) {
      return;
    }

    const tokenId = this.getOverrideTokenId(override.token);
    const factoryId = this.getOverrideId('factory', override.token);

    this.ensureSyntheticService(factoryId, override.useFactory(this));
    this.overrideTokenIds.set(override.token, tokenId);
    this.container.setAlias(tokenId, factoryId);
  }

  private applyValueOverride(override: DependencyOverride): void {
    if (!('useValue' in override)) {
      return;
    }

    const tokenId = this.getOverrideTokenId(override.token);
    const valueId = this.getOverrideId('value', override.token);

    this.ensureSyntheticService(valueId, override.useValue);
    this.overrideTokenIds.set(override.token, tokenId);
    this.container.setAlias(tokenId, valueId);
  }

  private applyOverrides(): void {
    for (const override of this.options.overrides ?? []) {
      this.applyClassOverride(override);
      this.applyFactoryOverride(override);
      this.applyValueOverride(override);
    }
  }

  private registerParentAliases(): void {
    for (const [id, definition] of this.definitions.entries()) {
      if (definition._abstract === true || !definition._parent) {
        continue;
      }

      this.container.setAlias(definition._parent, id);
    }
  }

  public async compile(): Promise<void> {
    if (this.options.containerBuild) {
      await this.ensureFolderExists(this.options.servicesYamlPath);
      this.autowire = new Autowire(this.container);
      this.autowire.serviceFile = new ServiceFile(
        this.options.servicesYamlPath,
        false,
      );
      await this.autowire.process();
    } else {
      this.loader = new YamlFileLoader(this.container);
      await this.loader.load(this.options.servicesYamlPath);
    }

    this.registerParentAliases();
    this.applyOverrides();
    await this.container.compile();
  }

  public getService<T>(serviceName: unknown): T {
    const overrideTokenId = this.overrideTokenIds.get(serviceName);

    if (overrideTokenId) {
      return this.container.get<T>(overrideTokenId);
    }

    const aliasServiceId = this.findAliasServiceId(serviceName);

    if (aliasServiceId) {
      return this.container.get<T>(aliasServiceId);
    }

    const childServiceId = this.findConcreteChildServiceId(serviceName);

    if (childServiceId) {
      return this.container.get<T>(childServiceId);
    }

    const registeredServiceId = this.findRegisteredServiceId(serviceName);

    if (registeredServiceId) {
      return this.container.get<T>(registeredServiceId);
    }

    return this.container.get<T>(serviceName);
  }
}

export default DependencyInjection;
