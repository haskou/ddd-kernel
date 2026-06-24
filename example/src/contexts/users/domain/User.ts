import { AggregateRoot } from '@haskou/ddd-kernel/domain';

import { UserId } from './value-objects/UserId.js';

export class User extends AggregateRoot {
  constructor(private readonly id: UserId) {
    super();
  }

  public toPrimitives(): { id: string } {
    return {
      id: this.id.toString(),
    };
  }
}
