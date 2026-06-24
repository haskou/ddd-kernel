export interface Event {
  decode(): string;
  encode(data: string): object;
  eventName(): string;
}
