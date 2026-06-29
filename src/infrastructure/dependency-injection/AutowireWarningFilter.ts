import type { Logger } from 'node-dependency-injection';

export class AutowireWarningFilter implements Logger {
  constructor(private readonly logger: Logger) {}

  private isIgnorableAutowireWarning(message: string): boolean {
    return (
      message.startsWith(
        'Autowire: file has export default declaration but no runtime default export:',
      ) ||
      message.startsWith(
        'Autowire: failed to create definition for undefined:',
      ) ||
      (message.startsWith('Autowire: failed to create definition for ') &&
        message.includes(
          "Cannot read properties of undefined (reading 'body')",
        ))
    );
  }

  public warn(message?: unknown, ...optionalParams: unknown[]): void {
    if (
      typeof message === 'string' &&
      this.isIgnorableAutowireWarning(message)
    ) {
      this.logger.debug?.(`Ignored ${message}`, ...optionalParams);

      return;
    }

    this.logger.warn(message, ...optionalParams);
  }

  public info(message?: unknown, ...optionalParams: unknown[]): void {
    this.logger.info?.(message, ...optionalParams);
  }

  public debug(message?: unknown, ...optionalParams: unknown[]): void {
    this.logger.debug?.(message, ...optionalParams);
  }
}
