/**
 * IDEMPOTENCY MODULE
 * Provides idempotency key handling and deduplication
 * Used to ensure command handlers are executed exactly once
 *
 * Example usage in create event handler:
 *   const idempotencyKey = generateIdempotencyKey(
 *     'events-service',
 *     'create-event',
 *     { userId, title, organizationId }
 *   );
 *   const cached = await this.idempotencyService.get(idempotencyKey);
 *   if (cached) return cached;
 *   const result = await this.createEvent(...);
 *   await this.idempotencyService.set(idempotencyKey, result, 3600);
 *   return result;
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'crypto';

/**
 * Idempotency cache entry
 */
interface IdempotencyCacheEntry<T> {
  result: T;
  timestamp: number;
  ttl: number;
}

/**
 * In-memory idempotency cache
 * In production, use Redis for distributed systems
 */
@Injectable()
export class IdempotencyService implements OnModuleDestroy {
  private cache = new Map<string, IdempotencyCacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout | undefined;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Generate idempotency key from operation details
   */
  static generateKey(
    service: string,
    operation: string,
    payload: Record<string, unknown>,
  ): string {
    const payloadString = JSON.stringify(payload);
    const hash = createHash('sha256').update(payloadString).digest('hex');
    return `${service}:${operation}:${hash}`;
  }

  /**
   * Get cached result if exists and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry.result as T;
  }

  /**
   * Store result in cache with TTL (in seconds)
   */
  set<T>(key: string, result: T, ttl: number = 3600): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      const age = now - entry.timestamp;
      if (age > entry.ttl * 1000) {
        toDelete.push(key);
      }
    });

    toDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size for monitoring
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
