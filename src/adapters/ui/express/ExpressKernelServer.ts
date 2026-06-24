import type { ErrorRequestHandler } from 'express';

import { createExpressServer } from 'routing-controllers';

import type { ExpressKernelServerOptions } from './ExpressKernelServerOptions.js';
import type { HttpApp } from './HttpApp.js';
import type { HttpServer } from './HttpServer.js';

export class ExpressKernelServer {
  private _app: HttpApp | undefined;
  private _server: HttpServer | undefined;

  constructor(private readonly options: ExpressKernelServerOptions) {}

  private registerErrorHandlers(app: HttpApp): void {
    const handlers = this.options.errorHandlers ?? [this.defaultErrorHandler()];

    for (const handler of handlers) {
      app.use(handler);
    }
  }

  private defaultErrorHandler(): ErrorRequestHandler {
    return (error, _request, response) => {
      response.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    };
  }

  public get app(): HttpApp {
    if (!this._app) {
      throw new Error('HTTP server is not running.');
    }

    return this._app;
  }

  public get server(): HttpServer {
    if (!this._server) {
      throw new Error('HTTP server is not running.');
    }

    return this._server;
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
    this._app = app;

    return new Promise((resolve) => {
      this._server = app.listen(this.options.port ?? 3000, () => {
        resolve();
      });
    });
  }
}
