import User from '../User.js';
import UserId from '../value-objects/UserId.js';

export default abstract class UserRepository {
  public abstract findById(id: UserId): Promise<User | null>;
}
