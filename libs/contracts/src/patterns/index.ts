// Message Patterns for TCP Transport
// These patterns act as "routes" for microservice communication
// The gateway sends messages with these patterns, and services listen for them

// ============================================================================
// AUTH SERVICE PATTERNS
// ============================================================================
export const AUTH_PATTERNS = {
  // Authentication operations
  LOGIN: 'auth.login',
  SIGNUP: 'auth.signup',
  VALIDATE_TOKEN: 'auth.validate_token',
  GET_USER_PROFILE: 'auth.get_user_profile',
} as const;

// ============================================================================
// EVENTS SERVICE PATTERNS
// ============================================================================
export const EVENTS_PATTERNS = {
  // CRUD operations
  CREATE: 'events.create',
  FIND_ALL: 'events.find_all',
  FIND_ONE: 'events.find_one',
  UPDATE: 'events.update',
  DELETE: 'events.delete',

  // Workflow operations
  SUBMIT: 'events.submit',
  APPROVE: 'events.approve',
  REJECT: 'events.reject',
} as const;

// Type definitions for pattern values
export type AuthPattern = (typeof AUTH_PATTERNS)[keyof typeof AUTH_PATTERNS];
export type EventsPattern =
  (typeof EVENTS_PATTERNS)[keyof typeof EVENTS_PATTERNS];
