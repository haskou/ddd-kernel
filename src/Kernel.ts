import path from 'node:path';

import type { Consumer } from './adapters/pubsub/index.js';
import type { Route } from './adapters/ui/routes/index.js';
import type { ServiceClass } from './infrastructure/dependency-injection/index.js';
import type { Initializer, Runtime } from './infrastructure/lifecycle/index.js';
import type { Scheduler } from './infrastructure/scheduler/index.js';
import type { KernelOptions } from './kernel/KernelOptions.js';

import { ConsoleKernelLogger } from './adapters/kernel/index.js';
import { DependencyInjection } from './infrastructure/dependency-injection/index.js';

export type { KernelOptions } from './kernel/KernelOptions.js';

export class Kernel {
  private static _consumers: Consumer[] = [];
  private static _di: DependencyInjection;
  private static _logger = new ConsoleKernelLogger();
  private static _routes: ServiceClass<Route>[] = [];
  private static _schedulers: Scheduler[] = [];

  constructor(private readonly options: KernelOptions = {}) {
    Kernel._logger = options.logger ?? new ConsoleKernelLogger();
  }

  public static get configDirectory(): string {
    return path.resolve(Kernel.rootDirectory, 'config');
  }

  public static get consumers(): Consumer[] {
    return Kernel._consumers;
  }

  public static get di(): DependencyInjection {
    return Kernel._di;
  }

  public static get logger(): ConsoleKernelLogger {
    return Kernel._logger;
  }

  public get logger(): ConsoleKernelLogger {
    return Kernel.logger;
  }

  public static get rootDirectory(): string {
    return process.cwd();
  }

  public static get routes(): ServiceClass<Route>[] {
    return Kernel._routes;
  }

  public static get schedulers(): Scheduler[] {
    return Kernel._schedulers;
  }

  public static get sourceDirectory(): string {
    return path.resolve(Kernel.rootDirectory, 'src');
  }

  private getConsumerFromClass(
    ClassDefinition: ServiceClass<Consumer>,
  ): Consumer {
    return Kernel.di.getService<Consumer>(ClassDefinition);
  }

  private getInitializerFromClass(
    ClassDefinition: ServiceClass<Initializer>,
  ): Initializer {
    return Kernel.di.getService<Initializer>(ClassDefinition);
  }

  private getRuntimeFromClass(ClassDefinition: ServiceClass<Runtime>): Runtime {
    return Kernel.di.getService<Runtime>(ClassDefinition);
  }

  private getSchedulerFromClass(
    ClassDefinition: ServiceClass<Scheduler>,
  ): Scheduler {
    return Kernel.di.getService<Scheduler>(ClassDefinition);
  }

  public get di(): DependencyInjection {
    return Kernel.di;
  }

  public async dependencyInjection(): Promise<void> {
    Kernel._di =
      this.options.di ??
      DependencyInjection.configure({
        containerBuild: process.env.CONTAINER_BUILD === 'true',
        servicesYamlPath:
          this.options.servicesYamlPath ??
          path.resolve(Kernel.configDirectory, 'container', 'services.yaml'),
        sourceDirectory: this.options.sourceDirectory ?? Kernel.sourceDirectory,
      });

    await Kernel._di.compile();
  }

  public getRoutes(): ServiceClass<Route>[] {
    return Kernel.routes;
  }

  public registerConsumers(
    ...ClassDefinitions: ServiceClass<Consumer>[]
  ): void {
    for (const ClassDefinition of ClassDefinitions) {
      Kernel._consumers.push(this.getConsumerFromClass(ClassDefinition));
    }
  }

  public registerConsumerInstances(...consumers: Consumer[]): void {
    Kernel._consumers.push(...consumers);
  }

  public registerRoutes(...ClassDefinitions: ServiceClass<Route>[]): void {
    Kernel._routes.push(...ClassDefinitions);
  }

  public registerSchedulers(
    ...ClassDefinitions: ServiceClass<Scheduler>[]
  ): void {
    for (const ClassDefinition of ClassDefinitions) {
      Kernel._schedulers.push(this.getSchedulerFromClass(ClassDefinition));
    }
  }

  public registerSchedulerInstances(...schedulers: Scheduler[]): void {
    Kernel._schedulers.push(...schedulers);
  }

  public removeConsumers(): void {
    Kernel._consumers = [];
  }

  public removeRoutes(): void {
    Kernel._routes = [];
  }

  public removeSchedulers(): void {
    Kernel._schedulers = [];
  }

  public async runConsumers(): Promise<void> {
    for (const consumer of Kernel.consumers) {
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
      await this.getRuntimeFromClass(ClassDefinition).run();
    }
  }

  public async runSchedulerNowAndSchedule(
    ClassDefinition: ServiceClass<Scheduler>,
  ): Promise<void> {
    const scheduler = this.getSchedulerFromClass(ClassDefinition);

    await scheduler.runOnce();
    await scheduler.init();
  }

  public async runSchedulers(): Promise<void> {
    for (const scheduler of Kernel.schedulers) {
      await scheduler.init();
    }
  }
}

export function createKernel(options?: KernelOptions): Kernel {
  return new Kernel(options);
}

export default Kernel;
