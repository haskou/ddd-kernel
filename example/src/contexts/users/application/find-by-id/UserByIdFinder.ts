import UserFinderService from '../../domain/services/UserFinderService.js';
import User from '../../domain/User.js';
import UserId from '../../domain/value-objects/UserId.js';

export default class UserByIdFinder {
  constructor(private readonly userFinderService: UserFinderService) {}

  public findById(id: UserId): Promise<User> {
    return this.userFinderService.findById(id);
  }
}
