import { Kernel } from '../../../Kernel.js';

export abstract class Route {
  public get<T>(service: unknown): T {
    return Kernel.di.getService<T>(service);
  }
}

export default Route;
