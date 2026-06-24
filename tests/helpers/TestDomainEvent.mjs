import { DomainEvent } from '../../dist/domain/index.js';

export class TestDomainEvent extends DomainEvent {
  eventName() {
    return 'test.domain-event';
  }
}
