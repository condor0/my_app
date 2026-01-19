import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  errors?: any;
  timestamp: string;
  path: string;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(HttpExceptionFilter.name)
    private logger: PinoLogger,
  ) {}

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message: this.getMessageForStatus(status),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Handle validation errors specially
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as any;

      if (responseObj.message === 'Validation failed') {
        errorResponse.errors = responseObj.message;
      } else if (Array.isArray(responseObj.message)) {
        errorResponse.errors = responseObj.message;
      } else if (typeof responseObj.message === 'string') {
        errorResponse.message = responseObj.message;
      }

      // Include custom error field if present
      if (responseObj.error) {
        errorResponse.error = responseObj.error;
      }
    }

    // Log the error
    this.logger.warn(
      {
        statusCode: status,
        message: errorResponse.message,
        path: request.url,
        method: request.method,
      },
      'HTTP Exception',
    );

    response.status(status).json(errorResponse);
  }

  private getMessageForStatus(status: number): string {
    const messages: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error',
    };
    return messages[status] || 'Error';
  }
}
