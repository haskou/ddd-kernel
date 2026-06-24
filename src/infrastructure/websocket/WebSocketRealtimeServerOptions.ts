import type { WebSocketConnectionAuthenticator } from './WebSocketConnectionAuthenticator.js';
import type { WebSocketEventHub } from './WebSocketEventHub.js';

export interface WebSocketRealtimeServerOptions<TIdentity = string> {
  readonly authenticator: WebSocketConnectionAuthenticator<TIdentity>;
  readonly eventHub: WebSocketEventHub<TIdentity>;
  readonly websocketPath?: string;
}
