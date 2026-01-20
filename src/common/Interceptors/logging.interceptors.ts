/**
 * LOGGING INTERCEPTOR
 * Logs HTTP requests with correlation IDs and performance metrics
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const { method, url } = request;
    const now = Date.now();

    // Get correlation context from request
    const requestId = (request as any).requestId;
    const correlationId = (request as any).correlationId;
    const traceId = (request as any).traceId;

    return next.handle().pipe(
      tap(
        () => {
          const statusCode = response.statusCode;
          const duration = Date.now() - now;
          this.logger.info(
            {
              method,
              url,
              statusCode,
              responseTime: `${duration}ms`,
              requestId,
              correlationId,
              traceId,
              service: process.env.SERVICE_NAME || 'unknown',
            },
            'HTTP Request Completed',
          );
        },
        (error) => {
          const duration = Date.now() - now;
          this.logger.error(
            {
              method,
              url,
              statusCode: response.statusCode,
              responseTime: `${duration}ms`,
              requestId,
              correlationId,
              traceId,
              service: process.env.SERVICE_NAME || 'unknown',
              error: error.message,
            },
            'HTTP Request Failed',
          );
        },
      ),
    );
  }
}
