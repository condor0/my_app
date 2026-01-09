import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

export interface ResponseEnvelope<T = any> {
  statusCode: number;
  message: string;
  data?: T;
  timestamp: string;
  path: string;
}

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(
    @InjectPinoLogger(ResponseEnvelopeInterceptor.name)
    private logger: PinoLogger,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseEnvelope> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data: unknown): ResponseEnvelope => {
        const statusCode = response.statusCode as number;
        const message = this.getMessageForStatusCode(statusCode);
        const path = request.url;
        const timestamp = new Date().toISOString();

        // If data is already an envelope or has specific structure, preserve it
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'meta' in data
        ) {
          return {
            statusCode,
            message,
            ...data,
            timestamp,
            path,
          };
        }

        // Otherwise wrap in envelope
        return {
          statusCode,
          message,
          data: data || null,
          timestamp,
          path,
        };
      }),
    );
  }

  private getMessageForStatusCode(statusCode: number): string {
    const messages: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      500: 'Internal Server Error',
    };
    return messages[statusCode] || 'Success';
  }
}
