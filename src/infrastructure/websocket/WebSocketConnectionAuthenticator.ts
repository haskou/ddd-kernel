import type { IncomingMessage } from 'node:http';

export interface WebSocketConnectionAuthenticator<TIdentity = string> {
  authenticate(request: IncomingMessage, websocketPath: string): TIdentity;
}
