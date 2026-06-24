import Route from '@haskou/ddd-kernel/adapters/ui/routes';
import { HttpRouteStatusEnum } from '@haskou/ddd-kernel/contracts/ui';
import { Response } from 'express';
import { Get, JsonController, Param, Res } from 'routing-controllers';

import UserByIdFinder from '../../../contexts/users/application/find-by-id/UserByIdFinder.js';
import { UserId } from '../../../contexts/users/domain/value-objects/UserId.js';

@JsonController('/users')
export default class GetUserByIdRoute extends Route {
  private readonly finder = this.get<UserByIdFinder>(UserByIdFinder);

  @Get('/:id')
  public async getUserById(
    @Param('id') id: string,
    @Res() response: Response,
  ): Promise<Response> {
    const user = await this.finder.findById(new UserId(id));

    return response.status(HttpRouteStatusEnum.OK).send(user.toPrimitives());
  }
}
