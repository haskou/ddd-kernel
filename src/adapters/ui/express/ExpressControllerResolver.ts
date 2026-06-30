import type { ExpressController } from './ExpressController.js';
import type { ExpressKernelServerOptions } from './ExpressKernelServerOptions.js';

export class ExpressControllerResolver {
  private readonly controllerInstances = new Map<ExpressController, unknown>();

  private readonly controllers: Set<ExpressController>;

  constructor(
    private readonly kernel: ExpressKernelServerOptions['kernel'],
    controllers: readonly ExpressController[],
  ) {
    this.controllers = new Set(controllers);
  }

  private createControllerInstance(
    ClassDefinition: ExpressController,
  ): unknown {
    const Controller = ClassDefinition as new () => unknown;

    return new Controller();
  }

  private getCachedController(ClassDefinition: ExpressController): unknown {
    const cached = this.controllerInstances.get(ClassDefinition);

    if (cached) {
      return cached;
    }

    const instance = this.createControllerInstance(ClassDefinition);

    this.controllerInstances.set(ClassDefinition, instance);

    return instance;
  }

  private isKnownController(ClassDefinition: ExpressController): boolean {
    return this.controllers.has(ClassDefinition);
  }

  private canResolveService(ClassDefinition: ExpressController): boolean {
    return this.kernel.di.hasService?.(ClassDefinition) === true;
  }

  public get(ClassDefinition: ExpressController): unknown {
    if (!this.canResolveService(ClassDefinition)) {
      if (this.isKnownController(ClassDefinition)) {
        return this.getCachedController(ClassDefinition);
      }

      return undefined;
    }

    return this.kernel.di.getService(ClassDefinition);
  }
}

export default ExpressControllerResolver;
