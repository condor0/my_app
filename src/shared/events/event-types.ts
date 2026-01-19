import { DomainEvent } from './domain-event.interface';

/**
 * Domain Event Types
 *
 * Define all domain events here with their payloads.
 * This provides a central registry of events in the system.
 */

// ============================================
// User Domain Events
// ============================================

export interface UserRegisteredEvent extends DomainEvent {
  type: 'user.registered';
  payload: {
    userId: number;
    email: string;
    name: string;
  };
}

export interface UserLoggedInEvent extends DomainEvent {
  type: 'user.logged_in';
  payload: {
    userId: number;
    email: string;
  };
}

// ============================================
// Event (Calendar Event) Domain Events
// ============================================

export interface EventCreatedEvent extends DomainEvent {
  type: 'event.created';
  payload: {
    eventId: number;
    title: string;
    ownerId: number;
    organizationId: number;
  };
}

export interface EventSubmittedEvent extends DomainEvent {
  type: 'event.submitted';
  payload: {
    eventId: number;
    title: string;
    ownerId: number;
    organizationId: number;
  };
}

export interface EventApprovedEvent extends DomainEvent {
  type: 'event.approved';
  payload: {
    eventId: number;
    title: string;
    approvedBy: number;
  };
}

export interface EventRejectedEvent extends DomainEvent {
  type: 'event.rejected';
  payload: {
    eventId: number;
    title: string;
    rejectedBy: number;
    reason?: string;
  };
}

export interface EventDeletedEvent extends DomainEvent {
  type: 'event.deleted';
  payload: {
    eventId: number;
    deletedBy: number;
  };
}

// ============================================
// Event Type Constants
// ============================================

export const DomainEventTypes = {
  // User events
  USER_REGISTERED: 'user.registered',
  USER_LOGGED_IN: 'user.logged_in',

  // Calendar event events
  EVENT_CREATED: 'event.created',
  EVENT_SUBMITTED: 'event.submitted',
  EVENT_APPROVED: 'event.approved',
  EVENT_REJECTED: 'event.rejected',
  EVENT_DELETED: 'event.deleted',
} as const;

// ============================================
// Factory functions for creating events
// ============================================

export function createUserRegisteredEvent(
  payload: UserRegisteredEvent['payload'],
  correlationId?: string,
): UserRegisteredEvent {
  return {
    type: 'user.registered',
    occurredAt: new Date(),
    correlationId,
    payload,
  };
}

export function createUserLoggedInEvent(
  payload: UserLoggedInEvent['payload'],
  correlationId?: string,
): UserLoggedInEvent {
  return {
    type: 'user.logged_in',
    occurredAt: new Date(),
    correlationId,
    payload,
  };
}

export function createEventCreatedEvent(
  payload: EventCreatedEvent['payload'],
  correlationId?: string,
): EventCreatedEvent {
  return {
    type: 'event.created',
    occurredAt: new Date(),
    correlationId,
    payload,
  };
}

export function createEventSubmittedEvent(
  payload: EventSubmittedEvent['payload'],
  correlationId?: string,
): EventSubmittedEvent {
  return {
    type: 'event.submitted',
    occurredAt: new Date(),
    correlationId,
    payload,
  };
}

export function createEventApprovedEvent(
  payload: EventApprovedEvent['payload'],
  correlationId?: string,
): EventApprovedEvent {
  return {
    type: 'event.approved',
    occurredAt: new Date(),
    correlationId,
    payload,
  };
}

export function createEventRejectedEvent(
  payload: EventRejectedEvent['payload'],
  correlationId?: string,
): EventRejectedEvent {
  return {
    type: 'event.rejected',
    occurredAt: new Date(),
    correlationId,
    payload,
  };
}

export function createEventDeletedEvent(
  payload: EventDeletedEvent['payload'],
  correlationId?: string,
): EventDeletedEvent {
  return {
    type: 'event.deleted',
    occurredAt: new Date(),
    correlationId,
    payload,
  };
}
