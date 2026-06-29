import dotenv, { type DotenvConfigOutput } from 'dotenv';
import path from 'node:path';

import type {
  ConsumerMiddleware,
  KernelConsumer,
  KernelLogger,
  KernelRoute,
  ShutdownHook,
} from './contracts/index.js';
import type { ServiceClass } from './infrastructure/dependency-injection/index.js';
import type { Initializer, Runtime } from './infrastructure/lifecycle/index.js';
import type { Scheduler } from './infrastructure/scheduler/index.js';
import type { KernelDependencyInjectionOptions } from './kernel/KernelDependencyInjectionOptions.js';
import type { KernelEnvironmentForSchema } from './kernel/KernelEnvironmentForSchema.js';
import type { KernelEnvironmentSchema } from './kernel/KernelEnvironmentSchema.js';
import type { KernelEnvironmentValue } from './kernel/KernelEnvironmentValue.js';
import type { KernelEnvironmentVariablesOptions } from './kernel/KernelEnvironmentVariablesOptions.js';
import type { KernelOptions } from './kernel/KernelOptions.js';
import type { ShutdownCandidate } from './kernel/ShutdownCandidate.js';

import { ConsoleKernelLogger } from './adapters/kernel/index.js';
import { DependencyInjection } from './infrastructure/dependency-injection/index.js';
import { KernelEnvironmentValidationError } from './kernel/KernelEnvironmentValidationError.js';

export type { KernelDependencyInjectionOptions } from './kernel/KernelDependencyInjectionOptions.js';
export type { KernelDefaultEnvironment } from './kernel/KernelDefaultEnvironment.js';
export type { KernelEnvironment } from './kernel/KernelEnvironment.js';
export type { KernelEnvironmentForSchema } from './kernel/KernelEnvironmentForSchema.js';
export type { KernelEnvironmentSchema } from './kernel/KernelEnvironmentSchema.js';
export type { KernelEnvironmentValue } from './kernel/KernelEnvironmentValue.js';
export type { KernelEnvironmentVariableDefinition } from './kernel/KernelEnvironmentVariableDefinition.js';
export type { KernelEnvironmentVariablePrimitive } from './kernel/KernelEnvironmentVariablePrimitive.js';
export type { KernelEnvironmentVariableResolvedValue } from './kernel/KernelEnvironmentVariableResolvedValue.js';
export type { KernelEnvironmentVariableType } from './kernel/KernelEnvironmentVariableType.js';
export type { KernelEnvironmentVariablesOptions } from './kernel/KernelEnvironmentVariablesOptions.js';
export type { KernelOptions } from './kernel/KernelOptions.js';
export { KernelEnvironmentValidationError } from './kernel/KernelEnvironmentValidationError.js';

export class Kernel<
  TEnvironmentSchema extends KernelEnvironmentSchema | undefined = undefined,
> {
  private static readonly stateKey = Symbol.for(
    '@haskou/ddd-kernel/kernel-state',
  );

  private readonly consumerMiddlewares: ConsumerMiddleware[] = [];
  private readonly consumersList: KernelConsumer[] = [];
  private readonly loggerInstance: KernelLogger;
  private readonly routesList: ServiceClass<KernelRoute>[] = [];
  private readonly schedulersList: Scheduler[] = [];
  private readonly shutdownHooks: ShutdownHook[] = [];
  private dependencyInjectionInstance: DependencyInjection | undefined;
  private environmentVariables =
    process.env as KernelEnvironmentForSchema<TEnvironmentSchema>;

  private static get state(): {
    activeKernel?: Kernel<KernelEnvironmentSchema | undefined>;
  } {
    const stateContainer = globalThis as typeof globalThis & {
      [Kernel.stateKey]?: {
        activeKernel?: Kernel<KernelEnvironmentSchema | undefined>;
      };
    };

    stateContainer[Kernel.stateKey] = stateContainer[Kernel.stateKey] ?? {};

    return stateContainer[Kernel.stateKey] as {
      activeKernel?: Kernel<KernelEnvironmentSchema | undefined>;
    };
  }

  public static get configDirectory(): string {
    return path.resolve(Kernel.rootDirectory, 'config');
  }

  public static get consumers(): KernelConsumer[] {
    return Kernel.getActiveKernel().consumers;
  }

  public static get consumerMiddleware(): ConsumerMiddleware[] {
    return Kernel.getActiveKernel().consumerMiddleware;
  }

  public static get di(): DependencyInjection {
    return Kernel.getActiveKernel().di;
  }

  public static get environment(): NodeJS.ProcessEnv {
    return process.env;
  }

  public static get logger(): KernelLogger {
    return Kernel.getActiveKernel().logger;
  }

  public static get active(): Kernel<KernelEnvironmentSchema | undefined> {
    return Kernel.getActiveKernel();
  }

  public static get rootDirectory(): string {
    return process.cwd();
  }

  public static get routes(): ServiceClass<KernelRoute>[] {
    return Kernel.getActiveKernel().routes;
  }

  public static get schedulers(): Scheduler[] {
    return Kernel.getActiveKernel().schedulers;
  }

  public static get sourceDirectory(): string {
    return path.resolve(Kernel.rootDirectory, 'src');
  }

  private static getActiveKernel(): Kernel<
    KernelEnvironmentSchema | undefined
  > {
    if (!Kernel.state.activeKernel) {
      Kernel.state.activeKernel = new Kernel();
    }

    return Kernel.state.activeKernel;
  }

  private static assertRequiredEnvironmentVariable(
    name: string,
    value: string | undefined,
    schema: KernelEnvironmentSchema,
  ): void {
    if (schema[name]?.required === true && value === undefined) {
      throw new KernelEnvironmentValidationError(
        `Missing required environment variable "${name}".`,
      );
    }
  }

  private static assertEnvironmentVariableChoice(
    name: string,
    value: KernelEnvironmentValue,
    schema: KernelEnvironmentSchema,
  ): void {
    const choices = schema[name]?.choices;

    if (choices && !choices.includes(value)) {
      throw new KernelEnvironmentValidationError(
        `Environment variable "${name}" must be one of: ${choices.join(', ')}.`,
      );
    }
  }

  private static getEnvironmentVariablesPath(
    environment: string,
    options: KernelEnvironmentVariablesOptions<
      KernelEnvironmentSchema | undefined
    >,
  ): string {
    return path.resolve(
      Kernel.rootDirectory,
      options.path ?? (environment ? `.env.${environment}` : '.env'),
    );
  }

  private static parseBooleanEnvironmentVariable(
    name: string,
    value: string,
  ): boolean {
    if (['1', 'true', 'yes', 'on'].includes(value.toLowerCase())) {
      return true;
    }

    if (['0', 'false', 'no', 'off'].includes(value.toLowerCase())) {
      return false;
    }

    throw new KernelEnvironmentValidationError(
      `Environment variable "${name}" must be a boolean.`,
    );
  }

  private static parseNumberEnvironmentVariable(
    name: string,
    value: string,
  ): number {
    if (value.trim() === '') {
      throw new KernelEnvironmentValidationError(
        `Environment variable "${name}" must be a number.`,
      );
    }

    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }

    throw new KernelEnvironmentValidationError(
      `Environment variable "${name}" must be a number.`,
    );
  }

  private static parseEnvironmentVariable(
    name: string,
    value: string,
    schema: KernelEnvironmentSchema,
  ): KernelEnvironmentValue {
    const definition = schema[name];

    if (definition.type === 'boolean') {
      const parsedValue = Kernel.parseBooleanEnvironmentVariable(name, value);

      Kernel.assertEnvironmentVariableChoice(name, parsedValue, schema);

      return parsedValue;
    }

    if (definition.type === 'number') {
      const parsedValue = Kernel.parseNumberEnvironmentVariable(name, value);

      Kernel.assertEnvironmentVariableChoice(name, parsedValue, schema);

      return parsedValue;
    }

    Kernel.assertEnvironmentVariableChoice(name, value, schema);

    return value;
  }

  private static validateEnvironmentVariables<
    TSchema extends KernelEnvironmentSchema,
  >(schema: TSchema): KernelEnvironmentForSchema<TSchema> {
    const environmentVariables: Record<string, KernelEnvironmentValue> = {};

    for (const [name, definition] of Object.entries(schema)) {
      const value = process.env[name] ?? definition.defaultValue?.toString();

      Kernel.assertRequiredEnvironmentVariable(name, value, schema);

      if (value !== undefined) {
        environmentVariables[name] = Kernel.parseEnvironmentVariable(
          name,
          value,
          schema,
        );
      }
    }

    return {
      ...process.env,
      ...environmentVariables,
    } as KernelEnvironmentForSchema<TSchema>;
  }

  public static loadEnvironmentVariables(
    environment?: string,
    options: KernelEnvironmentVariablesOptions<
      KernelEnvironmentSchema | undefined
    > = {},
  ): DotenvConfigOutput {
    const environmentName = environment ?? process.env.NODE_ENV ?? 'local';

    const result = dotenv.config({
      override: options.override,
      path: Kernel.getEnvironmentVariablesPath(environmentName, options),
    });

    if (options.schema) {
      Kernel.validateEnvironmentVariables(options.schema);
    }

    return result;
  }

  constructor(
    private readonly options: KernelOptions<TEnvironmentSchema> = {},
  ) {
    this.loggerInstance = options.logger ?? new ConsoleKernelLogger();
    this.dependencyInjectionInstance = options.di;
    Kernel.state.activeKernel = this;
  }

  private async closeCandidate(candidate: ShutdownCandidate): Promise<void> {
    if (candidate.shutdown) {
      await candidate.shutdown();

      return;
    }

    if (candidate.close) {
      await candidate.close();

      return;
    }

    if (candidate.stop) {
      await candidate.stop();

      return;
    }

    if (candidate.flush) {
      await candidate.flush();
    }
  }

  private getConsumerFromClass(
    ClassDefinition: ServiceClass<KernelConsumer>,
  ): KernelConsumer {
    return this.di.getService<KernelConsumer>(ClassDefinition);
  }

  private getInitializerFromClass(
    ClassDefinition: ServiceClass<Initializer>,
  ): Initializer {
    return this.di.getService<Initializer>(ClassDefinition);
  }

  private getRuntimeFromClass(ClassDefinition: ServiceClass<Runtime>): Runtime {
    return this.di.getService<Runtime>(ClassDefinition);
  }

  private getSchedulerFromClass(
    ClassDefinition: ServiceClass<Scheduler>,
  ): Scheduler {
    return this.di.getService<Scheduler>(ClassDefinition);
  }

  public get consumers(): KernelConsumer[] {
    return this.consumersList;
  }

  public get consumerMiddleware(): ConsumerMiddleware[] {
    return this.consumerMiddlewares;
  }

  public get di(): DependencyInjection {
    if (!this.dependencyInjectionInstance) {
      throw new Error('Kernel dependency injection has not been initialized.');
    }

    return this.dependencyInjectionInstance;
  }

  public get environment(): KernelEnvironmentForSchema<TEnvironmentSchema> {
    return this.environmentVariables;
  }

  public get logger(): KernelLogger {
    return this.loggerInstance;
  }

  public get routes(): ServiceClass<KernelRoute>[] {
    return this.routesList;
  }

  public get schedulers(): Scheduler[] {
    return this.schedulersList;
  }

  private getDependencyInjectionOptions(
    options: KernelDependencyInjectionOptions = {},
  ): Required<KernelDependencyInjectionOptions> {
    return {
      containerBuild:
        options.containerBuild ?? process.env.CONTAINER_BUILD === 'true',
      overrides: options.overrides ?? [],
      servicesYamlPath:
        options.servicesYamlPath ??
        this.options.servicesYamlPath ??
        path.resolve(Kernel.configDirectory, 'container', 'services.yaml'),
      sourceDirectory:
        options.sourceDirectory ??
        this.options.sourceDirectory ??
        Kernel.sourceDirectory,
    };
  }

  public async dependencyInjection(
    options: KernelDependencyInjectionOptions = {},
  ): Promise<void> {
    Kernel.state.activeKernel = this;
    this.dependencyInjectionInstance =
      this.dependencyInjectionInstance ??
      DependencyInjection.configure(
        this.getDependencyInjectionOptions(options),
      );

    await this.dependencyInjectionInstance.compile();
    Kernel.state.activeKernel = this;
  }

  public loadEnvironmentVariables(
    environment?: string,
    options: KernelEnvironmentVariablesOptions<
      KernelEnvironmentSchema | undefined
    > = {},
  ): DotenvConfigOutput {
    const result = Kernel.loadEnvironmentVariables(environment, {
      ...options,
      schema: options.schema ?? this.options.environmentSchema,
    });

    this.environmentVariables = this.options.environmentSchema
      ? Kernel.validateEnvironmentVariables(this.options.environmentSchema)
      : (process.env as KernelEnvironmentForSchema<TEnvironmentSchema>);

    return result;
  }

  public getRoutes(): ServiceClass<KernelRoute>[] {
    return this.routes;
  }

  public registerConsumerMiddleware(
    ...middlewares: ConsumerMiddleware[]
  ): void {
    this.consumerMiddlewares.push(...middlewares);
  }

  public registerConsumers(
    ...ClassDefinitions: ServiceClass<KernelConsumer>[]
  ): void {
    for (const ClassDefinition of ClassDefinitions) {
      this.consumersList.push(this.getConsumerFromClass(ClassDefinition));
    }
  }

  public registerConsumerInstances(...consumers: KernelConsumer[]): void {
    this.consumersList.push(...consumers);
  }

  public registerRoutes(
    ...ClassDefinitions: ServiceClass<KernelRoute>[]
  ): void {
    this.routesList.push(...ClassDefinitions);
  }

  public registerSchedulers(
    ...ClassDefinitions: ServiceClass<Scheduler>[]
  ): void {
    for (const ClassDefinition of ClassDefinitions) {
      this.schedulersList.push(this.getSchedulerFromClass(ClassDefinition));
    }
  }

  public registerSchedulerInstances(...schedulers: Scheduler[]): void {
    this.schedulersList.push(...schedulers);
  }

  public registerShutdownHook(hook: ShutdownHook): void {
    this.shutdownHooks.push(hook);
  }

  public removeConsumers(): void {
    this.consumersList.length = 0;
  }

  public removeRoutes(): void {
    this.routesList.length = 0;
  }

  public removeSchedulers(): void {
    this.schedulersList.length = 0;
  }

  public async runConsumers(): Promise<void> {
    for (const consumer of this.consumersList) {
      await consumer.init();
    }
  }

  public async runInitializers(
    ...ClassDefinitions: ServiceClass<Initializer>[]
  ): Promise<void> {
    for (const ClassDefinition of ClassDefinitions) {
      await this.getInitializerFromClass(ClassDefinition).ensure();
    }
  }

  public async runRuntimes(
    ...ClassDefinitions: ServiceClass<Runtime>[]
  ): Promise<void> {
    for (const ClassDefinition of ClassDefinitions) {
      const runtime = this.getRuntimeFromClass(ClassDefinition);

      await runtime.run();
      this.registerShutdownHook(() =>
        this.closeCandidate(runtime as ShutdownCandidate),
      );
    }
  }

  public async runSchedulerNowAndSchedule(
    ClassDefinition: ServiceClass<Scheduler>,
  ): Promise<void> {
    const scheduler = this.getSchedulerFromClass(ClassDefinition);

    await scheduler.runOnce();
    await scheduler.init();
    this.schedulersList.push(scheduler);
  }

  public async runSchedulers(): Promise<void> {
    for (const scheduler of this.schedulersList) {
      await scheduler.init();
    }
  }

  public async shutdown(): Promise<void> {
    for (const consumer of [...this.consumersList].reverse()) {
      await this.closeCandidate(consumer as ShutdownCandidate);
    }

    for (const scheduler of [...this.schedulersList].reverse()) {
      await this.closeCandidate(scheduler as ShutdownCandidate);
    }

    for (const hook of [...this.shutdownHooks].reverse()) {
      await hook();
    }

    await this.closeCandidate(this.loggerInstance as ShutdownCandidate);
  }
}

export function createKernel<
  TEnvironmentSchema extends KernelEnvironmentSchema | undefined = undefined,
>(options?: KernelOptions<TEnvironmentSchema>): Kernel<TEnvironmentSchema> {
  return new Kernel(options);
}

export default Kernel;
