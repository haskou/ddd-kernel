import type {
  ConsumerExecutionContext,
  ConsumerMiddleware,
  ConsumerNext,
} from '../../contracts/index.js';
import type { DomainEvent } from '../../domain/index.js';
import type { CorrelationConsumerMiddlewareOptions } from './CorrelationConsumerMiddlewareOptions.js';

export class CorrelationConsumerMiddleware implements ConsumerMiddleware {
  constructor(
    private readonly options: CorrelationConsumerMiddlewareOptions = {},
  ) {}

  public async handle(
    event: DomainEvent,
    next: ConsumerNext,
    context: ConsumerExecutionContext,
  ): Promise<void> {
    const correlationId =
      this.options.correlationId?.(event, context) ?? context.correlationId;
    const causationId =
      this.options.causationId?.(event, context) ?? context.causationId;

    if (correlationId) {
      event.withCorrelationId(correlationId);
    }

    if (causationId) {
      event.withCausationId(causationId);
    }

    await next();
  }
}

export default CorrelationConsumerMiddleware;
