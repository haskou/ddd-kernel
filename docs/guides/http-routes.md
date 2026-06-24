# HTTP Routes

Routes use `routing-controllers` and extend the shared `Route` base class:

```ts
import Route from '@haskou/ddd-kernel/adapters/ui/routes';
import { HttpRouteStatusEnum } from '@haskou/ddd-kernel/contracts/ui';
import { Response } from 'express';
import { Get, JsonController, Res } from 'routing-controllers';

@JsonController('/health')
export default class HealthRoute extends Route {
  @Get('/')
  public health(@Res() response: Response): Response {
    return response.status(HttpRouteStatusEnum.OK).send({ ok: true });
  }
}
```

Register route classes with the kernel:

```ts
kernel.registerRoutes(HealthRoute);
```
