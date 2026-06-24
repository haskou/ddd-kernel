export type WebSocketRealtimeMessage =
  | {
      readonly identityId: string;
      readonly type: 'connection_ack';
    }
  | {
      readonly event: unknown;
      readonly type: 'domain_event';
    }
  | {
      readonly payload: unknown;
      readonly type: string;
    };
