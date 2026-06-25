import type {
  PublishContext,
  PublisherHookErrorPolicy,
} from '../../contracts/index.js';

export class DefaultPublisherHookErrorPolicy implements PublisherHookErrorPolicy {
  public handleAfterPublishError(
    error: unknown,
    context: PublishContext,
  ): void {
    void error;
    void context;
  }

  public shouldFailAfterPublish(
    error: unknown,
    context: PublishContext,
  ): boolean {
    void error;
    void context;

    return false;
  }
}

export default DefaultPublisherHookErrorPolicy;
