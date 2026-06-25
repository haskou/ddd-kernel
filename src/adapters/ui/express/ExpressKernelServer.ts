import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from 'express';
import { useContainer, useExpressServer } from 'routing-controllers';

import type { ExpressController } from './ExpressController.js';
import type { ExpressKernelServerOptions } from './ExpressKernelServerOptions.js';
import type { ExpressPhaseHook } from './ExpressPhaseHook.js';
import type { HttpApp } from './HttpApp.js';
import type { HttpServer } from './HttpServer.js';

export class ExpressKernelServer {
  private readonly afterControllersHooks: ExpressKernelServerOptions['afterControllersHooks'];

  private appInstance: HttpApp | undefined;

  private readonly beforeControllersHooks: ExpressKernelServerOptions['beforeControllersHooks'];

  private readonly controllers: ExpressController[];

  private readonly errorHandlers: ErrorRequestHandler[];

  private readonly hooks: ExpressPhaseHook[];

  private readonly middlewares: RequestHandler[];

  private readonly postControllerMiddlewares: RequestHandler[];

  private readonly preControllerMiddlewares: RequestHandler[];

  private serverInstance: HttpServer | undefined;

  private readonly staticHooks: ExpressKernelServerOptions['staticHooks'];

  private readonly swaggerHooks: ExpressKernelServerOptions['swaggerHooks'];

  constructor(private readonly options: ExpressKernelServerOptions) {
    this.afterControllersHooks = this.copy(options.afterControllersHooks);
    this.beforeControllersHooks = this.copy(options.beforeControllersHooks);
    this.controllers = this.copy(options.controllers);
    this.errorHandlers = this.copy(options.errorHandlers);
    this.hooks = this.copy(options.hooks);
    this.middlewares = this.copy(options.middlewares);
    this.postControllerMiddlewares = this.copy(
      options.postControllerMiddlewares,
    );
    this.preControllerMiddlewares = this.copy(options.preControllerMiddlewares);
    this.staticHooks = this.copy(options.staticHooks);
    this.swaggerHooks = this.copy(options.swaggerHooks);
  }

  private copy<Type>(items: Type[] | undefined): Type[] {
    return [...(items ?? [])];
  }

  private configureControllerContainer(): void {
    useContainer(
      {
        get: (ClassDefinition: ExpressController) =>
          this.options.kernel.di.getService(ClassDefinition),
      },
      {
        fallback: true,
        fallbackOnErrors: true,
      },
    );
  }

  private applyErrorHandlers(app: HttpApp): void {
    const handlers =
      this.errorHandlers.length > 0
        ? this.errorHandlers
        : [this.defaultErrorHandler()];

    for (const handler of handlers) {
      app.use(handler);
    }
  }

  private defaultErrorHandler(): ErrorRequestHandler {
    return (error, request, response, next) => {
      void next;
      void request;

      response.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    };
  }

  private async runHooks(
    hooks: readonly ((app: HttpApp) => Promise<void> | void)[] | undefined,
    app: HttpApp,
  ): Promise<void> {
    for (const hook of hooks ?? []) {
      await hook(app);
    }
  }

  private async runPhaseHooks(
    phase: 'afterControllers' | 'beforeControllers' | 'beforeErrors',
    app: HttpApp,
  ): Promise<void> {
    for (const hook of this.hooks ?? []) {
      if (hook.phase === phase) {
        await hook.handle(app);
      }
    }
  }

  private applyMiddlewares(
    app: HttpApp,
    middlewares: readonly RequestHandler[] | undefined,
  ): void {
    for (const middleware of middlewares ?? []) {
      app.use(middleware);
    }
  }

  public get app(): HttpApp {
    if (!this.appInstance) {
      throw new Error('HTTP server is not running.');
    }

    return this.appInstance;
  }

  public get server(): HttpServer {
    if (!this.serverInstance) {
      throw new Error('HTTP server is not running.');
    }

    return this.serverInstance;
  }

  private assertServerIsNotRunning(): void {
    if (this.serverInstance) {
      throw new Error('HTTP server is already running.');
    }
  }

  public close(): Promise<void> {
    if (!this.serverInstance) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.serverInstance?.close((error?: Error) => {
        if (error) {
          reject(error);

          return;
        }

        this.serverInstance = undefined;
        this.appInstance = undefined;
        resolve();
      });
    });
  }

  public registerAfterControllersHooks(
    ...hooks: NonNullable<ExpressKernelServerOptions['afterControllersHooks']>
  ): this {
    this.assertServerIsNotRunning();
    this.afterControllersHooks?.push(...hooks);

    return this;
  }

  public registerBeforeControllersHooks(
    ...hooks: NonNullable<ExpressKernelServerOptions['beforeControllersHooks']>
  ): this {
    this.assertServerIsNotRunning();
    this.beforeControllersHooks?.push(...hooks);

    return this;
  }

  public registerControllers(...controllers: ExpressController[]): this {
    this.assertServerIsNotRunning();
    this.controllers.push(...controllers);

    return this;
  }

  public registerErrorHandlers(...handlers: ErrorRequestHandler[]): this {
    this.assertServerIsNotRunning();
    this.errorHandlers.push(...handlers);

    return this;
  }

  public registerHooks(...hooks: ExpressPhaseHook[]): this {
    this.assertServerIsNotRunning();
    this.hooks.push(...hooks);

    return this;
  }

  public registerMiddlewares(...middlewares: RequestHandler[]): this {
    this.assertServerIsNotRunning();
    this.middlewares.push(...middlewares);

    return this;
  }

  public registerPostControllerMiddlewares(
    ...middlewares: RequestHandler[]
  ): this {
    this.assertServerIsNotRunning();
    this.postControllerMiddlewares.push(...middlewares);

    return this;
  }

  public registerPreControllerMiddlewares(
    ...middlewares: RequestHandler[]
  ): this {
    this.assertServerIsNotRunning();
    this.preControllerMiddlewares.push(...middlewares);

    return this;
  }

  public async run(): Promise<void> {
    if (this.serverInstance) {
      throw new Error('HTTP server is already running.');
    }

    const controllers = [
      ...this.options.kernel.getRoutes(),
      ...this.controllers,
    ];
    const app = express() as HttpApp;

    this.applyMiddlewares(app, this.middlewares);
    this.applyMiddlewares(app, this.preControllerMiddlewares);
    await this.runHooks(this.beforeControllersHooks, app);
    await this.runPhaseHooks('beforeControllers', app);
    this.configureControllerContainer();
    useExpressServer(app, {
      controllers,
      routePrefix: this.options.routePrefix,
    });
    this.applyMiddlewares(app, this.postControllerMiddlewares);
    await this.runHooks(this.afterControllersHooks, app);
    await this.runPhaseHooks('afterControllers', app);
    await this.runHooks(this.swaggerHooks, app);
    await this.runHooks(this.staticHooks, app);
    await this.runPhaseHooks('beforeErrors', app);

    this.applyErrorHandlers(app);
    this.appInstance = app;

    return new Promise((resolve) => {
      this.serverInstance = app.listen(this.options.port ?? 3000, () => {
        resolve();
      });
    });
  }
}
