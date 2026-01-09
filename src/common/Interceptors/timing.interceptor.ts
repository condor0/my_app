import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

@Injectable()
export class TimingInterceptor implements NestInterceptor {
  constructor(
    @InjectPinoLogger(TimingInterceptor.name)
    private logger: PinoLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => {
          const endTime = process.hrtime.bigint();
          const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

          this.logger.info(
            {
              method: request.method,
              url: request.url,
              statusCode: context.switchToHttp().getResponse().statusCode,
              durationMs: duration.toFixed(2),
            },
            `Request completed`,
          );
        },
        error: (error) => {
          const endTime = process.hrtime.bigint();
          const duration = Number(endTime - startTime) / 1_000_000;

          this.logger.error(
            {
              method: request.method,
              url: request.url,
              durationMs: duration.toFixed(2),
              error: error.message,
            },
            `Request failed`,
          );
        },
      }),
    );
  }
}
