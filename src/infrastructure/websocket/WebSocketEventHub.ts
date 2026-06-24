import type { WebSocket } from 'ws';

import type { DomainEvent } from '../../domain/index.js';
import type { Log } from '../logs/index.js';
import type { WebSocketRealtimeMessage } from './WebSocketRealtimeMessage.js';
import type { WebSocketRecipientResolver } from './WebSocketRecipientResolver.js';

export class WebSocketEventHub<TIdentity = string> {
  private readonly clients = new Map<TIdentity, Set<WebSocket>>();

  constructor(
    private readonly recipientResolver?: WebSocketRecipientResolver<TIdentity>,
    private readonly logger?: Log,
  ) {}

  private send(client: WebSocket, message: WebSocketRealtimeMessage): void {
    if (client.readyState !== client.OPEN) {
      return;
    }

    client.send(JSON.stringify(message));
  }

  private unregister(identity: TIdentity, client: WebSocket): void {
    const identityClients = this.clients.get(identity);

    if (!identityClients) {
      return;
    }

    identityClients.delete(client);

    if (identityClients.size === 0) {
      this.clients.delete(identity);
    }
  }

  public register(identity: TIdentity, client: WebSocket): void {
    const identityClients = this.clients.get(identity) ?? new Set<WebSocket>();

    identityClients.add(client);
    this.clients.set(identity, identityClients);
    client.on('close', () => this.unregister(identity, client));

    this.send(client, {
      identityId: String(identity),
      type: 'connection_ack',
    });
  }

  public broadcast(event: DomainEvent): void {
    const recipients = this.recipientResolver?.resolve(event) ?? [];
    const message: WebSocketRealtimeMessage = {
      event: event.encode(event.decode()),
      type: 'domain_event',
    };

    for (const recipient of recipients) {
      this.sendToRecipient(recipient, message);
    }
  }

  public broadcastToAll(message: WebSocketRealtimeMessage): void {
    for (const identityClients of this.clients.values()) {
      for (const client of identityClients) {
        this.send(client, message);
      }
    }
  }

  public sendToRecipient(
    recipient: TIdentity,
    message: WebSocketRealtimeMessage,
  ): void {
    const identityClients = this.clients.get(recipient);

    if (!identityClients) {
      this.logger?.debug(`WebSocket recipient "${String(recipient)}" offline.`);

      return;
    }

    for (const client of identityClients) {
      this.send(client, message);
    }
  }
}
