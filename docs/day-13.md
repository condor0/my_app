# Day 13: Microservices Build & Deployment Fixes

## Overview
Fixed critical build, configuration, and deployment issues to get the microservices architecture fully operational with all smoke tests passing.

## Build Completion ✅

### Services Created
- **API Gateway** (Port 3000) - HTTP REST API entry point
- **Auth Service** (Port 3001) - Authentication via TCP
- **Events Service** (Port 3002) - Event CRUD via TCP
- **PostgreSQL** (Port 5432) - Shared database

### Transport: TCP
```typescript
ClientsModule.register([{
  name: SERVICE_TOKENS.AUTH_SERVICE,
  transport: Transport.TCP,
  options: { host: 'auth-service', port: 3001 }
}])
```

### Gateway Routes
| HTTP Endpoint | Message Pattern | Service |
|--------------|-----------------|---------|
| `POST /auth/signup` | `auth.signup` | Auth |
| `POST /auth/login` | `auth.login` | Auth |
| `GET /auth/profile` | `auth.get_user_profile` | Auth |
| `GET /events` | `events.findAll` | Events |
| `POST /events` | `events.create` | Events |
| `GET /events/:id` | `events.findOne` | Events |

### Contracts Library
Shared `@libscontracts` ensures type safety across services:
- `dto/` - Request/response DTOs
- `patterns/` - Message patterns
- `interfaces/` - Service response wrapper

### Definition of Done ✅
1. ✅ Login + Events working via gateway
2. ✅ All services running in docker-compose
3. ✅ 13/13 smoke tests passing

**Commands:**
```bash
npm run microservices:detach  # Start
npm run microservices:down    # Stop
npm run test:e2e -- --testPathPatterns="microservices-smoke"
```

---

## Issues Resolved

## Issues Resolved

### 1. TypeScript Path Mapping Configuration
**Problem:** Build failing with error: `Cannot find module '@libscontracts'`

**Root Cause:** The `@libscontracts` path alias was not configured in TypeScript compiler options.

**Solution:** Added path mappings to multiple tsconfig.json files:

```json
"paths": {
  "@libscontracts/*": ["libs/contracts/src/*"],
  "@libscontracts": ["libs/contracts/src"]
}
```

**Files Updated:**
- `tsconfig.json` (root)
- `apps/api-gateway/tsconfig.json`
- `apps/auth-service/tsconfig.json`
- `apps/events-service/tsconfig.json`

### 2. ESLint Type Safety Warnings
**Problem:** 10 warnings about unsafe argument types in error handling and logger calls.

**Solution:** Fixed type handling in catch blocks:

```typescript
// Before
catch (err) {
  const error = err as Error;
  this.logger.warn({ error: error.message }, 'Failed');
}

// After
catch (err) {
  const error = err instanceof Error ? err : new Error(String(err));
  const errorMessage: string = error.message;
  this.logger.warn(
    { error: errorMessage } as Record<string, unknown>,
    'Failed'
  );
}
```

**Files Updated:**
- `apps/auth-service/src/auth.controller.ts`
- `apps/auth-service/src/auth.service.ts`
- `apps/events-service/src/events.service.ts`

**Result:** Reduced warnings from 10 to 0. Build and lint now pass cleanly.

### 3. Docker Container Build Failures
**Problem:** Docker containers building successfully but crashing at runtime with:
```
Error: Cannot find module '/app/dist/main.js'
```

**Root Cause:** NestJS build creates nested directory structure:
- Build output: `/app/apps/{service}/dist/apps/{service}/src/main.js`
- CMD was looking for: `/app/dist/main.js`

**Solution:** Updated Dockerfile CMD in all three services:

```dockerfile
# Before
CMD ["node", "dist/main.js"]

# After
CMD ["node", "dist/apps/api-gateway/src/main.js"]
CMD ["node", "dist/apps/auth-service/src/main.js"]
CMD ["node", "dist/apps/events-service/src/main.js"]
```

**Files Updated:**
- `apps/api-gateway/Dockerfile`
- `apps/auth-service/Dockerfile`
- `apps/events-service/Dockerfile`

### 4. DTO Class Initialization Error
**Problem:** API Gateway crashing with:
```
ReferenceError: Cannot access 'UserProfileDto' before initialization
```

**Root Cause:** `LoginResponseDto` referenced `UserProfileDto` before it was defined, causing a forward reference error in compiled JavaScript.

**Solution:** Reordered class definitions in `apps/api-gateway/src/dto/auth.dto.ts`:

```typescript
// Before (wrong order)
export class LoginResponseDto {
  user: UserProfileDto;  // Reference before definition!
}
export class UserProfileDto { ... }

// After (correct order)
export class UserProfileDto { ... }
export class LoginResponseDto {
  user: UserProfileDto;  // Now properly defined
}
```

### 5. Database Configuration Verification
**Confirmed:** All microservices correctly share a single PostgreSQL container.

**Configuration:**
```yaml
services:
  postgres:
    container_name: myapp-postgres
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    
  auth-service:
    environment:
      DB_HOST: postgres  # ✓ Shared
      DB_DATABASE: myapp
  
  events-service:
    environment:
      DB_HOST: postgres  # ✓ Shared
      DB_DATABASE: myapp
```

**Result:** No duplicate database containers. All services use the same `myapp` database.

## Smoke Test Results

All 13 microservices smoke tests now passing:

```
PASS  test/microservices-smoke.e2e-spec.ts
  Microservices Smoke Tests
    Health Check
      ✓ GET /health - should return ok (81 ms)
      ✓ GET /health/detailed - should return service status (43 ms)
    Authentication
      ✓ POST /auth/signup - should register a new user (357 ms)
      ✓ POST /auth/signup - should fail for duplicate email (27 ms)
      ✓ POST /auth/login - should login and return token (241 ms)
      ✓ POST /auth/login - should fail with wrong password (226 ms)
      ✓ GET /auth/profile - should return user profile (26 ms)
      ✓ GET /auth/profile - should fail without token (11 ms)
    Events (via Gateway)
      ✓ GET /events - should return events list (35 ms)
      ✓ GET /events - should fail without auth (12 ms)
      ✓ POST /events - should require organization membership (32 ms)
    Gateway Routing
      ✓ should have Swagger documentation at /api (10 ms)
      ✓ should return 404 for unknown routes (10 ms)

Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
```

## Commands Reference

### Build & Lint
```bash
npm run build          # Build all services
npm run lint           # Run ESLint with auto-fix
```

### Docker Operations
```bash
npm run microservices:detach  # Start all services in background
npm run microservices:down    # Stop all services
npm run microservices:logs    # View service logs
```

### Testing
```bash
npm run test:e2e -- --testPathPatterns="microservices-smoke"
```

### Docker Manual Commands
```bash
# Remove images to force fresh build
docker image rm my_app-api-gateway my_app-auth-service my_app-events-service

# Check container status
docker ps --all

# View logs for specific service
docker-compose logs api-gateway --tail=50
```

## Architecture Validation

### ✅ Services Running
- **PostgreSQL**: Port 5432 (shared database)
- **Auth Service**: Port 3001 (TCP microservice)
- **Events Service**: Port 3002 (TCP microservice)
- **API Gateway**: Port 3000 (HTTP REST API)

### ✅ Communication Flow
```
Client → API Gateway (HTTP)
         ↓
         ├→ Auth Service (TCP)
         └→ Events Service (TCP)
              ↓
         PostgreSQL (Shared DB)
```

### ✅ Health Status
```bash
curl http://localhost:3000/health
# Response: {"status":"ok","timestamp":"2026-01-19T17:02:55.135Z"}
```

## Key Learnings

1. **Path Mappings Must Be Consistent**: When using TypeScript path aliases, ensure they're configured in ALL tsconfig.json files across the monorepo, not just the root.

2. **NestJS Build Output Structure**: NestJS preserves the workspace structure in the dist directory. Always verify the actual build output location before configuring Docker CMD.

3. **Class Order Matters in Decorators**: TypeScript decorators with metadata reflection require proper class ordering to avoid forward reference errors. Define classes before they're referenced.

4. **Docker Build Cache**: When changing source code, Docker may use cached layers. Use `docker image rm` to force a fresh build after significant changes.

5. **Error Type Safety**: Always validate error types in catch blocks instead of using type assertions, especially when passing to loggers or external libraries.

## Next Steps

With the microservices infrastructure now stable and tested:

1. **Performance Optimization**: Add caching, connection pooling
2. **Monitoring**: Implement metrics and distributed tracing
3. **Security Hardening**: Add rate limiting, input validation
4. **CI/CD Pipeline**: Automate testing and deployment
5. **Documentation**: API documentation with Swagger/OpenAPI
6. **Testing**: Add integration and load tests

## Status: ✅ Complete

All microservices are operational, fully tested, and production-ready for development work.
