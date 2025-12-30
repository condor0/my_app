import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PinoLogger } from 'nestjs-pino';
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    // This adds "context": "LoggingInterceptor" to every JSON log entry
    this.logger.setContext(LoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    // requestId comes from your CorrelationIdMiddleware
    const { method, url, requestId } = request; 
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        this.logger.info({
          requestId, 
          method,
          url,
          responseTime: `${duration}ms`,
        }, 'HTTP Request Completed');
      }),
    );
  }
}