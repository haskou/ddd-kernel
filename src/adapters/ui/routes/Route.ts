import { KernelRoute } from '../../../contracts/kernel/index.js';
import { Kernel } from '../../../Kernel.js';

export abstract class Route extends KernelRoute {
  public get<T>(service: unknown): T {
    return Kernel.di.getService<T>(service);
  }
}

export default Route;
