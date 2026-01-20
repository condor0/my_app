/**
 * RETRY UTILITY WITH EXPONENTIAL BACKOFF
 * Provides resilient request handling for gateway calls
 */

import { createHash } from 'crypto';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  timeoutMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  timeoutMs: 10000,
};

/**
 * Calculate exponential backoff delay
 * @param attempt Current attempt number (0-indexed)
 * @param initialDelay Initial delay in milliseconds
 * @param maxDelay Maximum delay in milliseconds
 * @param multiplier Backoff multiplier
 * @returns Delay in milliseconds
 */
export function calculateBackoff(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number,
): number {
  const delay = initialDelay * Math.pow(multiplier, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param config Retry configuration
 * @returns Promise with the result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), cfg.timeoutMs),
        ),
      ]);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < cfg.maxRetries) {
        const delayMs = calculateBackoff(
          attempt,
          cfg.initialDelayMs,
          cfg.maxDelayMs,
          cfg.backoffMultiplier,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Idempotency key generator for command deduplication
 * Format: {service}:{operation}:{payload_hash}
 */
export function generateIdempotencyKey(
  service: string,
  operation: string,
  payload: Record<string, unknown>,
): string {
  const payloadString = JSON.stringify(payload);
  const hash = createHash('sha256').update(payloadString).digest('hex');
  return `${service}:${operation}:${hash}`;
}
