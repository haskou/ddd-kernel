import type { PublishContext, PublisherHook } from '../../contracts/index.js';

export class PublisherHookPipeline {
  private readonly hooks: PublisherHook[] = [];

  constructor(hooks: readonly PublisherHook[] = []) {
    this.hooks.push(...hooks);
  }

  public register(...hooks: PublisherHook[]): void {
    this.hooks.push(...hooks);
  }

  public async run<T>(
    context: PublishContext,
    publish: () => Promise<T> | T,
  ): Promise<T> {
    for (const hook of this.hooks) {
      await hook.beforePublish?.(context);
    }

    try {
      const result = await publish();

      for (const hook of this.hooks) {
        await hook.afterPublish?.(context);
      }

      return result;
    } catch (error: unknown) {
      for (const hook of this.hooks) {
        await hook.onPublishError?.(error, context);
      }

      throw error;
    }
  }
}
