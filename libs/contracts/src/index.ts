// Shared contracts between microservices
// This ensures type safety and consistent message patterns across services

// Message Patterns - Used for request/response communication
export * from './patterns';

// DTOs - Shared data transfer objects
export * from './dto';

// Interfaces - Shared types and interfaces
export * from './interfaces';

// Utilities - Retry logic, resilient clients, and helpers
export * from './utils/retry.utils';
export * from './utils/resilient-client';
