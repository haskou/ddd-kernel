import winston, { format, type Logger } from 'winston';

import type { Log } from './Log.js';
import type { WinstonLoggerOptions } from './WinstonLoggerOptions.js';

export class WinstonLogger implements Log {
  private _logger: Logger | undefined;
  private prefix = '';

  constructor(private readonly options: WinstonLoggerOptions = {}) {}

  private get logger(): Logger {
    if (!this._logger) {
      this._logger = winston.createLogger({
        level: this.options.logLevel ?? process.env.LOG_LEVEL ?? 'info',
        transports: [
          new winston.transports.Console({
            format: this.consoleFormat(),
          }),
          new winston.transports.File({
            filename: this.getLogFileName(),
            format: this.jsonFormat(),
          }),
        ],
      });
    }

    return this._logger;
  }

  private consoleFormat(): winston.Logform.Format {
    return format.combine(
      format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      format.colorize(),
      format.printf((entry) => {
        const timestamp = String(entry.timestamp || '');
        const level = String(entry.level);
        const message = this.formatConsoleMessage(entry.message);

        return `${timestamp} ${level.padEnd(7)} ${message}`;
      }),
    );
  }

  private jsonFormat(): winston.Logform.Format {
    return format.combine(
      format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      format.json(),
    );
  }

  private getLogFileName(): string {
    const rootDirectory = this.options.rootDirectory ?? process.cwd();
    const logDirectory =
      this.options.logDirectory ?? process.env.LOG_URL ?? 'logs';
    const serviceName =
      this.options.serviceName ?? process.env.SERVICE_NAME ?? 'service';

    return `${rootDirectory}/${logDirectory}/${serviceName}.log`;
  }

  private formatConsoleMessage(message: unknown): string {
    if (typeof message !== 'string') {
      return String(message);
    }

    const parsedMessage = this.parseJSONMessage(message);

    if (!parsedMessage) {
      return message;
    }

    return Object.entries(parsedMessage)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${this.formatConsoleValue(value)}`)
      .join(' ');
  }

  private formatConsoleValue(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.formatConsoleValue(item)).join(',')}]`;
    }

    if (value && typeof value === 'object') {
      return JSON.stringify(value);
    }

    return JSON.stringify(value);
  }

  private parseJSONMessage(
    message: string,
  ): Record<string, unknown> | undefined {
    try {
      const parsedMessage: unknown = JSON.parse(message);

      if (
        !parsedMessage ||
        typeof parsedMessage !== 'object' ||
        Array.isArray(parsedMessage)
      ) {
        return undefined;
      }

      return parsedMessage as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }

  public run(prefix?: string): void {
    this.prefix = prefix || '';
  }

  public error(message: string): void {
    this.logger.error(this.prefix + message);
  }

  public warn(message: string): void {
    this.logger.warn(this.prefix + message);
  }

  public info(message: string): void {
    this.logger.info(this.prefix + message);
  }

  public debug(message: string): void {
    this.logger.debug(this.prefix + message);
  }
}
