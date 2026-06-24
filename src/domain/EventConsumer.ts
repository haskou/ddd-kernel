import type { Event } from './Event.js';

export abstract class EventConsumer<TEvent extends Event = Event> {
  public abstract consume(event: TEvent): Promise<void>;
}
