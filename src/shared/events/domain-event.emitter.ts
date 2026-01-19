import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DomainEvent, DomainEventHandler } from './domain-event.interface';

/**
 * In-process domain event emitter for decoupled module communication.
 *
 * This provides a lightweight pub/sub mechanism that allows modules to
 * communicate without direct dependencies. Events are processed synchronously
 * in the same transaction context.
 *
 * For distributed systems, this can later be swapped for a message broker
 * (RabbitMQ, Kafka, etc.) without changing the consuming code.
 */
@Injectable()
export class DomainEventEmitter {
  private handlers: Map<string, Set<DomainEventHandler>> = new Map();

  constructor(
    @InjectPinoLogger(DomainEventEmitter.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Subscribe to a specific event type
   */
  on<T extends DomainEvent>(
    eventType: string,
    handler: DomainEventHandler<T>,
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const handlers = this.handlers.get(eventType)!;
    handlers.add(handler as DomainEventHandler);

    this.logger.debug({ eventType }, 'Domain event handler registered');

    // Return unsubscribe function
    return () => {
      handlers.delete(handler as DomainEventHandler);
      this.logger.debug({ eventType }, 'Domain event handler unregistered');
    };
  }

  /**
   * Emit a domain event to all registered handlers
   */
  async emit<T extends DomainEvent>(event: T): Promise<void> {
    const handlers = this.handlers.get(event.type);

    this.logger.info(
      {
        eventType: event.type,
        correlationId: event.correlationId,
        handlerCount: handlers?.size ?? 0,
      },
      'Emitting domain event',
    );

    if (!handlers || handlers.size === 0) {
      this.logger.debug({ eventType: event.type }, 'No handlers for event');
      return;
    }

    const errors: Error[] = [];

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(
          { eventType: event.type, error },
          'Domain event handler failed',
        );
        errors.push(error as Error);
      }
    }

    // Log if any handlers failed but don't throw
    // This ensures all handlers get a chance to run
    if (errors.length > 0) {
      this.logger.warn(
        { eventType: event.type, errorCount: errors.length },
        'Some domain event handlers failed',
      );
    }
  }

  /**
   * Emit multiple events in order
   */
  async emitAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.emit(event);
    }
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clearAll(): void {
    this.handlers.clear();
    this.logger.debug('All domain event handlers cleared');
  }
}
