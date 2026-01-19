// ============================================================================
// COMMON DTOs
// Shared response structures and error handling
// ============================================================================

/**
 * Standard success response wrapper
 */
export class ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;

  static ok<T>(data: T): ServiceResponse<T> {
    return { success: true, data };
  }

  static fail<T>(error: ServiceError): ServiceResponse<T> {
    return { success: false, error };
  }
}

/**
 * Standard error structure for microservice communication
 */
export class ServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    this.code = code;
    this.message = message;
    this.details = details;
  }
}

/**
 * Common error codes used across services
 */
export const ERROR_CODES = {
  // Auth errors
  INVALID_CREDENTIALS: 'AUTH_001',
  EMAIL_EXISTS: 'AUTH_002',
  INVALID_TOKEN: 'AUTH_003',
  UNAUTHORIZED: 'AUTH_004',

  // Event errors
  EVENT_NOT_FOUND: 'EVENT_001',
  EVENT_ACCESS_DENIED: 'EVENT_002',
  INVALID_EVENT_STATUS: 'EVENT_003',
  ORGANIZATION_REQUIRED: 'EVENT_004',

  // General errors
  VALIDATION_ERROR: 'GENERAL_001',
  INTERNAL_ERROR: 'GENERAL_002',
  NOT_FOUND: 'GENERAL_003',
} as const;

/**
 * User context passed with authenticated requests
 */
export interface UserContext {
  userId: number;
  email: string;
  role: string;
  organizationId?: number;
}
