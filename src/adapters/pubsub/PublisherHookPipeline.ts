import type {
  PublishContext,
  PublisherHook,
  PublisherHookErrorPolicy,
} from '../../contracts/index.js';

import { DefaultPublisherHookErrorPolicy } from './DefaultPublisherHookErrorPolicy.js';

export class PublisherHookPipeline {
  private readonly hooks: PublisherHook[] = [];

  constructor(
    hooks: readonly PublisherHook[] = [],
    private readonly errorPolicy: PublisherHookErrorPolicy = new DefaultPublisherHookErrorPolicy(),
  ) {
    this.hooks.push(...hooks);
  }

  private async runAfterPublishHooks(context: PublishContext): Promise<void> {
    for (const hook of this.hooks) {
      await this.runAfterPublishHook(hook, context);
    }
  }

  private async runAfterPublishHook(
    hook: PublisherHook,
    context: PublishContext,
  ): Promise<void> {
    try {
      await hook.afterPublish?.(context);
    } catch (error: unknown) {
      await this.errorPolicy.handleAfterPublishError(error, context);

      if (this.errorPolicy.shouldFailAfterPublish(error, context)) {
        throw error;
      }
    }
  }

  private async runBeforePublishHooks(context: PublishContext): Promise<void> {
    for (const hook of this.hooks) {
      await hook.beforePublish?.(context);
    }
  }

  private async runPublishErrorHooks(
    error: unknown,
    context: PublishContext,
  ): Promise<void> {
    for (const hook of this.hooks) {
      await hook.onPublishError?.(error, context);
    }
  }

  public register(...hooks: PublisherHook[]): void {
    this.hooks.push(...hooks);
  }

  public async run<T>(
    context: PublishContext,
    publish: () => Promise<T> | T,
  ): Promise<T> {
    await this.runBeforePublishHooks(context);

    try {
      const result = await publish();

      await this.runAfterPublishHooks(context);

      return result;
    } catch (error: unknown) {
      await this.runPublishErrorHooks(error, context);

      throw error;
    }
  }
}
