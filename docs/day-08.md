# Day 8: Event Moderation Workflow & Global Logging

## Overview
Implemented a comprehensive event moderation workflow with state transitions and integrated structured logging globally across all services for observability.

## Key Features Implemented

### 1. Event Moderation Workflow (State Transitions)
- **Draft → Pending**: Users submit events for review using `/events/:id/submit` endpoint
- **Pending → Published**: Moderators/Admins approve events using `/events/:id/approve` endpoint
- **Pending → Rejected**: Moderators/Admins reject events using `/events/:id/reject` endpoint with reason
- Event status enum: `DRAFT | PENDING | PUBLISHED | REJECTED`
- Role-based access control: Only moderators and admins can approve/reject
- Ownership enforcement: Only event owners can submit their own events

### 2. State Transition Validation
- Prevents invalid state transitions with `409 Conflict` HTTP status
- Returns `403 Forbidden` when users lack required roles
- Returns `400 Bad Request` for invalid reject reasons
- Returns `404 Not Found` for non-existent events

### 3. Global Pino Logger Integration
- Added structured logging to all services:
  - **AuthService**: User signup/login with email and userId
  - **EventsService**: All CRUD operations and state transitions
  - **EventsController**: HTTP request logging with method and URL
  - **AuthController**: Authentication operations logging
  - **UsersController**: User management operations
  - **AppService**: Application endpoints
  
- Logging context includes:
  - User ID and role information
  - Event ID and status changes
  - Moderator ID (for approve/reject operations)
  - Rejection reasons
  - Response times and HTTP status codes

### 4. Input Validation Enhancements
- Added `@IsNotEmpty()` decorator to date field in CreateEventDto
- Configured ValidationPipe globally with strict rules:
  - `transform: true` - Type coercion
  - `whitelist: true` - Remove non-DTO properties
  - `forbidNonWhitelisted: true` - Error on extra properties
  - `stopAtFirstError: true` - Stop validation at first error

### 5. JWT Authentication Improvements
- Created custom `JwtAuthGuard` with robust error handling
- Properly handles edge cases:
  - Missing "Bearer" prefix returns `401 Unauthorized`
  - Empty bearer tokens return `401 Unauthorized`
  - Malformed tokens return `401 Unauthorized`
- Updated all protected routes to use JwtAuthGuard

## Endpoints Added

### Event Moderation
- `POST /events/:id/submit` - Submit event for moderation (DRAFT → PENDING)
- `POST /events/:id/approve` - Approve pending event (PENDING → PUBLISHED)
- `POST /events/:id/reject` - Reject pending event with reason (PENDING → REJECTED)

## Test Coverage
- **72/72 tests passing** (100% success rate)
  - 17 moderation workflow tests
  - 18 events CRUD tests
  - 22 RBAC authorization tests
  - 15 general authorization tests
  
- Comprehensive test scenarios:
  - Valid state transitions
  - Invalid state transition prevention
  - Role-based access enforcement
  - Ownership validation
  - Input validation (missing/invalid fields)
  - JWT token edge cases

## Technical Implementation

### Database Schema
- Event entity status field: `ENUM('draft', 'pending', 'published', 'rejected')`
- Default status on creation: `DRAFT`
- Status validation at service layer

### Error Handling
- Custom HttpExceptionFilter for consistent error responses
- Proper HTTP status codes for all scenarios
- Detailed error messages for debugging

### Code Quality
- **ESLint**: 0 errors (configured with strict TypeScript rules)
- **Type Safety**: Full TypeScript coverage with proper DTO definitions
- **Structured Logging**: Audit trail for all operations
- **Role-Based Access**: Enforced at controller level with guards

## Files Modified
- `src/events/events.service.ts` - Added submit, approve, reject methods
- `src/events/events.controller.ts` - Added moderation endpoints
- `src/events/dto/create-event.dto.ts` - Added validation
- `src/events/dto/reject-event.dto.ts` - New DTO for rejection
- `src/auth/guards/jwt-auth.guard.ts` - New custom JWT guard
- `src/auth/jwt.strategy.ts` - Improved JWT extraction
- All service classes - Added @InjectPinoLogger and logging
- `src/main.ts` - Enhanced ValidationPipe configuration

## Migration Strategy
- Used `synchronize: false` in TypeORM configuration
- Implemented manual migrations for schema changes
- Event table properly configured with status enum

## Next Steps
- Monitor logging in production for observability insights
- Consider adding event lifecycle webhooks
- Implement approval history tracking
- Add moderation queue/dashboard endpoints
