export type WebSocketClientMessage = Record<string, unknown> & {
  readonly type?: string;
};
