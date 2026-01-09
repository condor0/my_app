// Shared module public API
// Export only what other modules need

export { Role } from './enums';
export { SharedModule } from './shared.module';

// Domain Events
export { DomainEventEmitter } from './events/domain-event.emitter';
export type { DomainEvent } from './events/domain-event.interface';
export * from './events/event-types';
