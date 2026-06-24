import User from '../domain/User.js';
import UserRepository from '../domain/repositories/UserRepository.js';
import UserId from '../domain/value-objects/UserId.js';

export default class InMemoryUserRepository extends UserRepository {
  private readonly users = new Map<string, User>([
    [
      '9d25a62f-4c83-4a8b-94cf-60d5f33823f2',
      new User(new UserId('9d25a62f-4c83-4a8b-94cf-60d5f33823f2')),
    ],
  ]);

  public findById(id: UserId): Promise<User | null> {
    return Promise.resolve(this.users.get(id.toString()) ?? null);
  }
}
