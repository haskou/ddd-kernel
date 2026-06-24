import { DomainError } from '@haskou/value-objects';

import UserId from '../value-objects/UserId.js';

export default class UserNotFoundError extends DomainError {
  constructor(id: UserId) {
    super(`User with id ${id.toString()} not found`);
  }
}
