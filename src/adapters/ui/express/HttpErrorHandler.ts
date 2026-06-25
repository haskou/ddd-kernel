import type { NextFunction, Request, Response } from 'express';

import {
  type ExpressErrorMiddlewareInterface,
  HttpError,
} from 'routing-controllers';

import type { ErrorExplanation } from './ErrorExplanation.js';
import type { ErrorResponseHandler } from './ErrorResponseHandler.js';
import type { FormattedValidationError } from './FormattedValidationError.js';
import type { HttpErrorHandlerOptions } from './HttpErrorHandlerOptions.js';
import type { HttpErrorLike } from './HttpErrorLike.js';
import type { PayloadTooLargeError } from './PayloadTooLargeError.js';
import type { ValidationError } from './ValidationError.js';

import { HttpRouteStatusEnum } from '../../../contracts/ui/index.js';

export class HttpErrorHandler implements ExpressErrorMiddlewareInterface {
  private readonly handlers: readonly ErrorResponseHandler[];

  private readonly exposeUnhandledErrorsIn: readonly string[];

  constructor(private readonly options: HttpErrorHandlerOptions = {}) {
    this.handlers = options.handlers ?? [];
    this.exposeUnhandledErrorsIn = options.exposeUnhandledErrorsIn ?? [
      'local',
      'test',
    ];
  }

  private formatValidationErrors(
    errors: readonly ValidationError[],
  ): FormattedValidationError[] {
    return errors.flatMap((error) => {
      if (error.children && error.children.length > 0) {
        return this.formatValidationErrors(error.children);
      }

      return [
        {
          details: error.constraints,
          property: error.property,
          value: error.value,
        },
      ];
    });
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private getHttpStatus(error: HttpErrorLike): number | undefined {
    return error.httpCode ?? error.statusCode ?? error.status;
  }

  private isPayloadTooLargeError(error: PayloadTooLargeError): boolean {
    return (
      error.type === 'entity.too.large' ||
      this.getHttpStatus(error) === HttpRouteStatusEnum.PAYLOAD_TOO_LARGE
    );
  }

  private logUnhandledError(error: Error): void {
    this.options.logger?.error(`Unhandled error: ${error.message}`);
    this.options.logger?.debug(error.stack ?? 'No stack trace available');
  }

  private handleSyntaxError(error: Error, response: Response): boolean {
    if (!(error instanceof SyntaxError)) {
      return false;
    }

    response.status(HttpRouteStatusEnum.BAD_REQUEST).json({
      code: 'SyntaxError',
      message: 'Malformed JSON',
    });

    return true;
  }

  private handlePayloadTooLargeError(
    error: Error,
    response: Response,
  ): boolean {
    if (!this.isPayloadTooLargeError(error)) {
      return false;
    }

    response.status(HttpRouteStatusEnum.PAYLOAD_TOO_LARGE).json({
      code: 'PayloadTooLargeError',
      httpStatus: HttpRouteStatusEnum.PAYLOAD_TOO_LARGE,
      message: 'Request entity too large.',
    });

    return true;
  }

  private handleHttpError(error: Error, response: Response): boolean {
    const httpError = error as HttpErrorLike;
    const httpStatus = this.getHttpStatus(httpError);

    if (!httpStatus && !(error instanceof HttpError)) {
      return false;
    }

    response
      .status(httpStatus ?? HttpRouteStatusEnum.INTERNAL_SERVER_ERROR)
      .json({
        code: error.name,
        errors: this.formatValidationErrors(
          (error as ErrorExplanation).errors ?? [],
        ),
        httpStatus: httpStatus ?? HttpRouteStatusEnum.INTERNAL_SERVER_ERROR,
        message: error.message,
      });

    return true;
  }

  private handleUnhandledError(
    error: Error,
    response: Response,
    next: NextFunction,
  ): void {
    if (this.exposeUnhandledErrorsIn.includes(process.env.NODE_ENV ?? '')) {
      this.logUnhandledError(error);
    }

    response.status(HttpRouteStatusEnum.INTERNAL_SERVER_ERROR).json({
      code:
        error.constructor.name ||
        String(HttpRouteStatusEnum.INTERNAL_SERVER_ERROR),
      message: error.message || 'Unknown error',
    });

    next(error);
  }

  public error(
    error: Error,
    request: Request,
    response: Response,
    next: NextFunction,
  ): void {
    void request;

    const handlers: ErrorResponseHandler[] = [
      this.handleSyntaxError.bind(this),
      this.handlePayloadTooLargeError.bind(this),
      ...this.handlers,
      this.handleHttpError.bind(this),
    ];

    if (handlers.some((handler) => handler(error, response))) {
      return;
    }

    this.handleUnhandledError(error, response, next);
  }

  public handle = (
    error: Error,
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    this.error(error, request, response, next);
  };
}

export default HttpErrorHandler;
