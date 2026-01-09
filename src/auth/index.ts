/**
 * Auth Module Public API
 *
 * This barrel file exports only what other modules should consume.
 * Internal implementation details are not exported.
 */

// Module
export { AuthModule } from './auth.module';

// Guards (for use in other modules)
export { RolesGuard } from './guards/roles.guard';
export { Roles } from './decorators/roles.decorator';

// DTOs (for external consumers if needed)
export { LoginDto } from './dto/login.dto';
export { SignupDto } from './dto/signup.dto';

// Re-export Role from shared for backwards compatibility
// New code should import from '@shared' directly
export { Role } from '../shared';
