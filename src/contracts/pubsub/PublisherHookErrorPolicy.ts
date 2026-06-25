import type { PublishContext } from './PublishContext.js';

export interface PublisherHookErrorPolicy {
  handleAfterPublishError(
    error: unknown,
    context: PublishContext,
  ): Promise<void> | void;
  shouldFailAfterPublish(error: unknown, context: PublishContext): boolean;
}
