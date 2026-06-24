import type { ErrorRequestHandler } from 'express';

import { createExpressServer } from 'routing-controllers';

import type { ExpressKernelServerOptions } from './ExpressKernelServerOptions.js';
import type { HttpApp } from './HttpApp.js';
import type { HttpServer } from './HttpServer.js';

export class ExpressKernelServer {
  private appInstance: HttpApp | undefined;
  private serverInstance: HttpServer | undefined;

  constructor(private readonly options: ExpressKernelServerOptions) {}

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

  public run(): Promise<void> {
    const app = createExpressServer({
      controllers: this.options.kernel.getRoutes(),
      routePrefix: this.options.routePrefix,
    }) as HttpApp;

    for (const middleware of this.options.middlewares ?? []) {
      app.use(middleware);
    }

    this.registerErrorHandlers(app);
    this.appInstance = app;

    return new Promise((resolve) => {
      this.serverInstance = app.listen(this.options.port ?? 3000, () => {
        resolve();
      });
    });
  }
}
