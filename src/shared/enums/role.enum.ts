/**
 * User roles for authorization.
 * Shared across modules to avoid circular dependencies.
 */
export enum Role {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}
