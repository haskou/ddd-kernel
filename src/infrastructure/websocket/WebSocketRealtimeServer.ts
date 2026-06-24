import type { IncomingMessage, Server as HttpServer } from 'node:http';
import type { Duplex } from 'node:stream';

import { WebSocketServer } from 'ws';

import type { WebSocketRealtimeServerOptions } from './WebSocketRealtimeServerOptions.js';

export class WebSocketRealtimeServer<TIdentity = string> {
  private readonly server = new WebSocketServer({ noServer: true });

  constructor(
    private readonly options: WebSocketRealtimeServerOptions<TIdentity>,
  ) {}

  private handleUpgrade(
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer,
    websocketPath: string,
  ): void {
    const url = new URL(request.url || '/', 'http://localhost');

    if (url.pathname !== websocketPath) {
      return;
    }

    try {
      const identity = this.options.authenticator.authenticate(
        request,
        websocketPath,
      );

      this.server.handleUpgrade(request, socket, head, (client) => {
        this.options.eventHub.register(identity, client);
        this.server.emit('connection', client, request);
      });
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  }

  public attach(httpServer: HttpServer): void {
    const websocketPath = this.options.websocketPath ?? '/ws';

    httpServer.on('upgrade', (request, socket, head) => {
      this.handleUpgrade(request, socket, head, websocketPath);
    });
  }
}
