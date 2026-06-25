import type { PublishContext } from './PublishContext.js';

export interface PublisherHook {
  afterPublish?(context: PublishContext): Promise<void> | void;
  beforePublish?(context: PublishContext): Promise<void> | void;
  onPublishError?(
    error: unknown,
    context: PublishContext,
  ): Promise<void> | void;
}
