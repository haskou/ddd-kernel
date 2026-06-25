import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from 'express';
import { useContainer, useExpressServer } from 'routing-controllers';

import type { ExpressController } from './ExpressController.js';
import type { ExpressKernelServerOptions } from './ExpressKernelServerOptions.js';
import type { HttpApp } from './HttpApp.js';
import type { HttpServer } from './HttpServer.js';

export class ExpressKernelServer {
  private appInstance: HttpApp | undefined;
  private serverInstance: HttpServer | undefined;

  constructor(private readonly options: ExpressKernelServerOptions) {}

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

  private registerErrorHandlers(app: HttpApp): void {
    const handlers = this.options.errorHandlers ?? [this.defaultErrorHandler()];

    for (const handler of handlers) {
      app.use(handler);
    }
  }

  private defaultErrorHandler(): ErrorRequestHandler {
    return (error, request, response) => {
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
    for (const hook of this.options.hooks ?? []) {
      if (hook.phase === phase) {
        await hook.handle(app);
      }
    }
  }

  private registerMiddlewares(
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

  public async run(): Promise<void> {
    if (this.serverInstance) {
      throw new Error('HTTP server is already running.');
    }

    const controllers = [
      ...this.options.kernel.getRoutes(),
      ...(this.options.controllers ?? []),
    ];
    const app = express() as HttpApp;

    this.registerMiddlewares(app, this.options.middlewares);
    this.registerMiddlewares(app, this.options.preControllerMiddlewares);
    await this.runHooks(this.options.beforeControllersHooks, app);
    await this.runPhaseHooks('beforeControllers', app);
    this.configureControllerContainer();
    useExpressServer(app, {
      controllers,
      routePrefix: this.options.routePrefix,
    });
    this.registerMiddlewares(app, this.options.postControllerMiddlewares);
    await this.runHooks(this.options.afterControllersHooks, app);
    await this.runPhaseHooks('afterControllers', app);
    await this.runHooks(this.options.swaggerHooks, app);
    await this.runHooks(this.options.staticHooks, app);
    await this.runPhaseHooks('beforeErrors', app);

    this.registerErrorHandlers(app);
    this.appInstance = app;

    return new Promise((resolve) => {
      this.serverInstance = app.listen(this.options.port ?? 3000, () => {
        resolve();
      });
    });
  }
}
