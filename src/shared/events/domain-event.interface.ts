/**
 * Base interface for all domain events.
 * Domain events represent something that happened in the domain
 * that other parts of the system might be interested in.
 */
export interface DomainEvent {
  /** Unique event type identifier */
  readonly type: string;
  /** When the event occurred */
  readonly occurredAt: Date;
  /** Correlation ID for tracing */
  readonly correlationId?: string;
  /** Event payload */
  readonly payload: Record<string, unknown>;
}

/**
 * Type-safe event handler signature
 */
export type DomainEventHandler<T extends DomainEvent = DomainEvent> = (
  event: T,
) => void | Promise<void>;
