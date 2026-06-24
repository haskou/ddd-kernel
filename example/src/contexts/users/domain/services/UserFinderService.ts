import { assert } from '@haskou/value-objects';

import UserNotFoundError from '../errors/UserNotFoundError.js';
import UserRepository from '../repositories/UserRepository.js';
import User from '../User.js';
import UserId from '../value-objects/UserId.js';

export default class UserFinderService {
  constructor(private readonly userRepository: UserRepository) {}

  public async findById(id: UserId): Promise<User> {
    const user = await this.userRepository.findById(id);
    assert(user !== null, new UserNotFoundError(id));

    return user;
  }
}
