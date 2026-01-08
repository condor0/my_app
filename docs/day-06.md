# Day 6: RBAC Authorization (roles/policies)

## Overview
This day implements Role-Based Access Control (RBAC) to enforce authorization policies across the application. The system supports three roles: `user`, `moderator`, and `admin`, with increasingly restrictive permissions.

## Implementation Details

### 1. Roles Definition
**File**: `src/auth/enums/role.enum.ts`

```typescript
export enum Role {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}
```

Three distinct roles are defined:
- **USER**: Basic user with minimal permissions
- **MODERATOR**: Can manage content and user activities
- **ADMIN**: Full system access

### 2. Database Schema Update
**File**: `src/database/migrations/1767250000000-AddRoleToUsers.ts`

Added a `role` column to the `users` table:
- Type: `ENUM` with values `['user', 'moderator', 'admin']`
- Default: `'user'`
- All existing users default to the `user` role

### 3. User Entity Enhancement
**File**: `src/user/entities/user.entity.ts`

Updated the User entity with the role property:
```typescript
@Column({ type: 'enum', enum: Role, default: Role.USER })
role: Role;
```

### 4. @Roles Decorator
**File**: `src/auth/decorators/roles.decorator.ts`

Created a custom decorator to mark routes with required roles:
```typescript
@Roles(Role.ADMIN)  // Only admins can access
@Roles(Role.MODERATOR, Role.ADMIN)  // Moderators and admins can access
```

### 5. RolesGuard Implementation
**File**: `src/auth/guards/roles.guard.ts`

Implements role-based access control:
- Checks if the current user has one of the required roles
- Returns **403 Forbidden** if the user lacks required permissions
- Works in conjunction with `@UseGuards(AuthGuard(), RolesGuard)`

### 6. JWT Payload Enhancement
**File**: `src/auth/jwt.strategy.ts`

Updated JWT token payload to include the `role`:
```typescript
interface JwtPayload {
  sub: number;
  email: string;
  role: string;  // Added
}
```

**File**: `src/auth/auth.service.ts`

Updated login method to include role in the JWT token:
```typescript
const payload = { email: user.email, sub: user.id, role: user.role };
```

### 7. Protected Routes
**File**: `src/auth/auth.controller.ts`

Added two protected sample routes:

#### Admin-Only Route
```typescript
@Delete('/admin/users/:id')
@UseGuards(AuthGuard(), RolesGuard)
@Roles(Role.ADMIN)
deleteUser(...): { message: string }
```
- Only accessible by users with `ADMIN` role
- Returns 403 if user doesn't have admin role

#### Moderator+ Route
```typescript
@Post('/moderator/content')
@UseGuards(AuthGuard(), RolesGuard)
@Roles(Role.MODERATOR, Role.ADMIN)
manageContent(...): { message: string }
```
- Accessible by moderators and admins
- Returns 403 if user is just a regular user

## Testing

### End-to-End Tests
**File**: `test/rbac.e2e-spec.ts`

Comprehensive test suite covering:

#### 401 Unauthorized Tests
- Missing Authorization header
- Malformed Authorization header (missing Bearer prefix)
- Invalid/tampered token
- Empty Bearer token
- Missing token entirely

#### 403 Forbidden Tests
- Regular users accessing admin-only routes
- Regular users accessing moderator-only routes
- Error messages for insufficient permissions

#### 200 Success Tests
- Users accessing permitted routes
- Moderators accessing moderator routes
- Admins accessing all protected routes
- Role hierarchy validation (admins can access moderator routes)

#### Setup and Validation Tests
- User creation with default role (user)
- Token generation
- Role persistence across requests

### Running Tests
```bash
# Run all e2e tests
npm run test:e2e

# Run specific RBAC tests
npm run test:e2e -- rbac
```

## Key Features

✅ **Role Checks Enforced Reliably**
- Roles are stored in the database with enum type constraints
- JWT tokens include the user's role
- Guards validate permissions on every request

✅ **HTTP Status Codes**
- **401**: Returned when missing or invalid token
- **403**: Returned when user lacks required role
- **200**: Returned when user has required permissions

✅ **Comprehensive Test Coverage**
- Tests cover both 401 and 403 scenarios
- Edge cases like tampered tokens are tested
- Role hierarchy is validated

## Usage Examples

### Accessing Admin Route (Admin User)
```bash
curl -X DELETE http://localhost:3000/auth/admin/users/1 \
  -H "Authorization: Bearer <admin_token>"
# Returns: 200 OK { message: "Admin can delete users" }
```

### Accessing Admin Route (Regular User)
```bash
curl -X DELETE http://localhost:3000/auth/admin/users/1 \
  -H "Authorization: Bearer <user_token>"
# Returns: 403 Forbidden { message: "You do not have permission..." }
```

### Accessing Without Token
```bash
curl -X DELETE http://localhost:3000/auth/admin/users/1
# Returns: 401 Unauthorized
```

## File Structure
```
src/auth/
├── decorators/
│   └── roles.decorator.ts       # @Roles decorator
├── enums/
│   └── role.enum.ts             # Role definitions
├── guards/
│   └── roles.guard.ts           # RolesGuard implementation
├── auth.controller.ts           # Protected routes
├── auth.service.ts              # Role included in JWT
├── auth.module.ts               # RolesGuard exported
├── jwt.strategy.ts              # Role in JWT payload
└── ...

src/user/entities/
└── user.entity.ts               # User with role column

src/database/migrations/
└── 1767250000000-AddRoleToUsers.ts  # Migration to add role

test/
└── rbac.e2e-spec.ts             # Comprehensive RBAC tests
```

## Migration Steps
1. Run the database migration to add the role column
2. All existing users will default to `USER` role
3. Manually update specific users to `MODERATOR` or `ADMIN` roles as needed
4. New signups automatically get `USER` role

## Future Enhancements
- API endpoint to promote users to moderator/admin roles
- Granular permission-based system (beyond role-based)
- Authorization for other resources (posts, comments, etc.)
- Audit logging for permission checks
- Rate limiting per role
