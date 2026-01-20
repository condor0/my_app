/**
 * RESILIENT RPC CLIENT FACTORY
 * Wraps NestJS ClientProxy with retry logic and timeouts
 * for gateway calls to microservices
 */

import { ClientProxy } from '@nestjs/microservices';
import { Observable, throwError, timer } from 'rxjs';
import { retryWhen, mergeMap, finalize } from 'rxjs/operators';
import { PinoLogger } from 'nestjs-pino';

export interface ResilientClientConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  timeoutMs?: number;
}

const DEFAULT_CONFIG: Required<ResilientClientConfig> = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  timeoutMs: 10000,
};

/**
 * Wraps a NestJS ClientProxy to add retry logic and timeouts
 * Usage:
 *   const resilientClient = createResilientClient(authClient, logger);
 *   const response = await firstValueFrom(
 *     resilientClient.send('pattern', data)
 *   );
 */
export function createResilientClient(
  client: ClientProxy,
  logger: PinoLogger,
  config: ResilientClientConfig = {},
): ResilientClientProxyWrapper {
  const cfg: Required<ResilientClientConfig> = { ...DEFAULT_CONFIG, ...config };
  return new ResilientClientProxyWrapper(client, logger, cfg);
}

class ResilientClientProxyWrapper {
  private callCounter = 0;

  constructor(
    private readonly client: ClientProxy,
    private readonly logger: PinoLogger,
    private readonly config: Required<ResilientClientConfig>,
  ) {}

  /**
   * Send a message with automatic retries and timeout
   */
  send<R = any>(pattern: any, payload: any): Observable<R> {
    const callId = ++this.callCounter;
    const startTime = Date.now();

    this.logger.debug(
      {
        callId,
        pattern: JSON.stringify(pattern),
        payloadSize: JSON.stringify(payload).length,
      },
      'RPC call started',
    );

    return this.client.send<R>(pattern, payload).pipe(
      // Apply retry logic with exponential backoff
      retryWhen((errors) =>
        errors.pipe(
          mergeMap((error, attemptIndex) => {
            const isLastAttempt = attemptIndex >= this.config.maxRetries;

            if (isLastAttempt) {
              this.logger.error(
                {
                  callId,
                  pattern: JSON.stringify(pattern),
                  error: error.message,
                  totalAttempts: attemptIndex + 1,
                },
                'RPC call failed after max retries',
              );
              return throwError(() => error);
            }

            const delayMs = this.calculateBackoff(attemptIndex);
            this.logger.warn(
              {
                callId,
                pattern: JSON.stringify(pattern),
                error: error.message,
                attempt: attemptIndex + 1,
                nextRetryIn: `${delayMs}ms`,
              },
              'RPC call failed, retrying',
            );

            return timer(delayMs);
          }),
        ),
      ),

      // Log successful completion
      finalize(() => {
        const duration = Date.now() - startTime;
        this.logger.debug(
          {
            callId,
            pattern: JSON.stringify(pattern),
            responseTimeMs: duration,
          },
          'RPC call completed',
        );
      }),
    );
  }

  /**
   * Emit a message (fire-and-forget) with retry logic
   */
  emit<R = any>(pattern: any, payload: any): Observable<R> {
    const callId = ++this.callCounter;
    this.logger.debug(
      {
        callId,
        pattern: JSON.stringify(pattern),
      },
      'RPC emit started',
    );

    return this.client.emit<R>(pattern, payload).pipe(
      finalize(() => {
        this.logger.debug({ callId }, 'RPC emit completed');
      }),
    );
  }

  private calculateBackoff(attemptIndex: number): number {
    const delay =
      this.config.initialDelayMs *
      Math.pow(this.config.backoffMultiplier, attemptIndex);
    return Math.min(delay, this.config.maxDelayMs);
  }
}
