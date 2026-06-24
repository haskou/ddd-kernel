# Consumer

Base class for application pub/sub consumers.

```ts
import Consumer from '@haskou/ddd-kernel/adapters/pubsub';

export default class RegisterUserWhenCreated extends Consumer {
  public get queueName() {
    return 'users.register-user';
  }
}
```

Consumers are registered by class:

```ts
kernel.registerConsumers(RegisterUserWhenCreated);
```
