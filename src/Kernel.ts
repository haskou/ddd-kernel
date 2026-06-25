import path from 'node:path';

import type { Consumer } from './adapters/pubsub/index.js';
import type { Route } from './adapters/ui/routes/index.js';
import type {
  ConsumerMiddleware,
  KernelLogger,
  ShutdownHook,
} from './contracts/index.js';
import type { ServiceClass } from './infrastructure/dependency-injection/index.js';
import type { Initializer, Runtime } from './infrastructure/lifecycle/index.js';
import type { Scheduler } from './infrastructure/scheduler/index.js';
import type { KernelOptions } from './kernel/KernelOptions.js';
import type { ShutdownCandidate } from './kernel/ShutdownCandidate.js';

import { ConsoleKernelLogger } from './adapters/kernel/index.js';
import { DependencyInjection } from './infrastructure/dependency-injection/index.js';

export type { KernelOptions } from './kernel/KernelOptions.js';

export class Kernel {
  private static readonly stateKey = Symbol.for(
    '@haskou/ddd-kernel/kernel-state',
  );

  private readonly consumerMiddlewares: ConsumerMiddleware[] = [];
  private readonly consumersList: Consumer[] = [];
  private readonly loggerInstance: KernelLogger;
  private readonly routesList: ServiceClass<Route>[] = [];
  private readonly schedulersList: Scheduler[] = [];
  private readonly shutdownHooks: ShutdownHook[] = [];
  private dependencyInjectionInstance: DependencyInjection | undefined;

  private static get state(): { activeKernel?: Kernel } {
    const stateContainer = globalThis as typeof globalThis & {
      [Kernel.stateKey]?: { activeKernel?: Kernel };
    };

    stateContainer[Kernel.stateKey] = stateContainer[Kernel.stateKey] ?? {};

    return stateContainer[Kernel.stateKey] as { activeKernel?: Kernel };
  }

  public static get configDirectory(): string {
    return path.resolve(Kernel.rootDirectory, 'config');
  }

  public static get consumers(): Consumer[] {
    return Kernel.getActiveKernel().consumers;
  }

  public static get consumerMiddleware(): ConsumerMiddleware[] {
    return Kernel.getActiveKernel().consumerMiddleware;
  }

  public static get di(): DependencyInjection {
    return Kernel.getActiveKernel().di;
  }

  public static get logger(): KernelLogger {
    return Kernel.getActiveKernel().logger;
  }

  public static get active(): Kernel {
    return Kernel.getActiveKernel();
  }

  public static get rootDirectory(): string {
    return process.cwd();
  }

  public static get routes(): ServiceClass<Route>[] {
    return Kernel.getActiveKernel().routes;
  }

  public static get schedulers(): Scheduler[] {
    return Kernel.getActiveKernel().schedulers;
  }

  public static get sourceDirectory(): string {
    return path.resolve(Kernel.rootDirectory, 'src');
  }

  private static getActiveKernel(): Kernel {
    if (!Kernel.state.activeKernel) {
      Kernel.state.activeKernel = new Kernel();
    }

    return Kernel.state.activeKernel;
  }

  constructor(private readonly options: KernelOptions = {}) {
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
    ClassDefinition: ServiceClass<Consumer>,
  ): Consumer {
    return this.di.getService<Consumer>(ClassDefinition);
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

  public get consumers(): Consumer[] {
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

  public get logger(): KernelLogger {
    return this.loggerInstance;
  }

  public get routes(): ServiceClass<Route>[] {
    return this.routesList;
  }

  public get schedulers(): Scheduler[] {
    return this.schedulersList;
  }

  public async dependencyInjection(): Promise<void> {
    this.dependencyInjectionInstance =
      this.dependencyInjectionInstance ??
      DependencyInjection.configure({
        containerBuild: process.env.CONTAINER_BUILD === 'true',
        servicesYamlPath:
          this.options.servicesYamlPath ??
          path.resolve(Kernel.configDirectory, 'container', 'services.yaml'),
        sourceDirectory: this.options.sourceDirectory ?? Kernel.sourceDirectory,
      });

    await this.dependencyInjectionInstance.compile();
  }

  public getRoutes(): ServiceClass<Route>[] {
    return this.routes;
  }

  public registerConsumerMiddleware(
    ...middlewares: ConsumerMiddleware[]
  ): void {
    this.consumerMiddlewares.push(...middlewares);
  }

  public registerConsumers(
    ...ClassDefinitions: ServiceClass<Consumer>[]
  ): void {
    for (const ClassDefinition of ClassDefinitions) {
      this.consumersList.push(this.getConsumerFromClass(ClassDefinition));
    }
  }

  public registerConsumerInstances(...consumers: Consumer[]): void {
    this.consumersList.push(...consumers);
  }

  public registerRoutes(...ClassDefinitions: ServiceClass<Route>[]): void {
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

export function createKernel(options?: KernelOptions): Kernel {
  return new Kernel(options);
}

export default Kernel;
