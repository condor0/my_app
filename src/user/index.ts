/**
 * User Module Public API
 *
 * This barrel file exports only what other modules should consume.
 * Internal implementation details are not exported.
 */

// Entities (for TypeORM relations in other modules)
export { User } from './entities/user.entity';
export { Organization } from './entities/organization.entity';

// DTOs
export { CreateUserDto } from './create-user.dto';
