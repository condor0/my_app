# Day 12: Modular Monolith Architecture

## Overview

Today we refactored the application into a **modular monolith** architecture. This pattern provides the organizational benefits of microservices (clear boundaries, domain separation) while maintaining the simplicity of a monolith deployment.

## Module Structure

```
src/
├── shared/              # Cross-cutting concerns (global)
│   ├── enums/           # Shared enumerations (Role)
│   ├── events/          # Domain event system
│   └── shared.module.ts
├── auth/                # Authentication & authorization
│   ├── guards/
│   ├── decorators/
│   ├── dto/
│   └── auth.module.ts
├── events/              # Calendar events domain
│   ├── entities/
│   ├── dto/
│   ├── enums/
│   └── events.module.ts
├── user/                # User & organization entities
│   └── entities/
├── common/              # Infrastructure (middleware, interceptors)
├── filters/             # Exception filters
└── health/              # Health checks
```

## Module Boundaries

### Shared Module (Global)

The `SharedModule` is marked as `@Global()` and contains:
- **Role enum**: Used across auth and events modules
- **Domain event system**: In-process pub/sub for decoupled communication

**Why it's shared:**
- Role is needed by both `User` entity and `EventsService` for authorization
- Domain events enable modules to react to changes without direct dependencies

### Auth Module

**Responsibilities:**
- User registration and login
- JWT token generation and validation
- Role-based access control (RBAC)

**Public API (index.ts):**
```typescript
export { AuthModule } from './auth.module';
export { RolesGuard } from './guards/roles.guard';
export { Roles } from './decorators/roles.decorator';
export { LoginDto, SignupDto } from './dto';
```

**Dependencies:**
- `SharedModule` (Role enum, DomainEventEmitter)
- `TypeOrmModule` (User entity)

### Events Module

**Responsibilities:**
- CRUD operations for calendar events
- Event moderation workflow (draft → pending → published/rejected)
- Organization-scoped access control

**Public API (index.ts):**
```typescript
export { EventsModule } from './events.module';
export { EventsService } from './events.service';
export { Event } from './entities/event.entity';
export { EventStatus } from './enums/event-status.enum';
```

**Dependencies:**
- `SharedModule` (Role enum, DomainEventEmitter)
- `AuthModule` (guards for route protection)

### User Module

**Responsibilities:**
- User and Organization entity definitions
- User controller for admin operations

**Public API (index.ts):**
```typescript
export { User } from './entities/user.entity';
export { Organization } from './entities/organization.entity';
export { CreateUserDto } from './create-user.dto';
```

## Circular Dependency Resolution

### Problem

TypeORM entities had circular imports:
```
user.entity.ts → organization.entity.ts → user.entity.ts
```

### Solution

Used TypeORM's **string-based relation references**:

```typescript
// user.entity.ts
@ManyToOne('Organization', 'users', { onDelete: 'CASCADE' })
@JoinColumn({ name: 'organizationId' })
organization?: Organization;

// organization.entity.ts
@OneToMany('User', 'organization')
users?: User[];
```

Combined with `import type` for TypeScript type-only imports:
```typescript
import type { Organization } from './organization.entity';
```

This ensures:
- No runtime circular dependencies
- TypeScript still provides type checking
- madge may still report the dependency but it's type-only

## Domain Events System

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Domain Event Emitter                     │
│                       (In-Process)                          │
├─────────────────────────────────────────────────────────────┤
│ emit(event)  ──────────────→  handlers.forEach(h => h())    │
│ on(type, handler)  ─────────→  handlers.set(type, handler)  │
└─────────────────────────────────────────────────────────────┘
         ↑                              ↓
    AuthService                   (Future handlers)
    EventsService                 - Notifications
                                  - Analytics
                                  - Audit logs
```

### Event Types

```typescript
// User domain
user.registered   // When a new user signs up
user.logged_in    // When a user logs in

// Event (calendar) domain
event.created     // When an event is created
event.submitted   // When draft → pending
event.approved    // When pending → published
event.rejected    // When pending → rejected
event.deleted     // When an event is deleted
```

### Usage Example

**Emitting events:**
```typescript
// In AuthService
await this.eventEmitter.emit(
  createUserRegisteredEvent({
    userId: user.id,
    email: user.email,
    name: user.name,
  }),
);
```

**Subscribing to events (future use):**
```typescript
// In NotificationService
@OnModuleInit()
onModuleInit() {
  this.eventEmitter.on('user.registered', async (event) => {
    await this.sendWelcomeEmail(event.payload.email);
  });
}
```

### Benefits

1. **Loose coupling**: Modules don't need to know about each other
2. **Extensibility**: Add new behaviors without modifying existing code
3. **Auditability**: Events create a natural audit trail
4. **Future-proof**: Can evolve to distributed events (RabbitMQ, Kafka) later

## Public Module APIs

Each module exports only what other modules need through `index.ts` barrel files:

| Module | Exports |
|--------|---------|
| `shared` | `Role`, `DomainEventEmitter`, event types |
| `auth` | `AuthModule`, `RolesGuard`, `Roles`, DTOs |
| `events` | `EventsModule`, `EventsService`, `Event`, `EventStatus` |
| `user` | `User`, `Organization`, `CreateUserDto` |

### Import Convention

```typescript
// Preferred: Import from barrel
import { Role, DomainEventEmitter } from '../shared';
import { EventsService, EventStatus } from '../events';

// Avoid: Deep imports
import { Role } from '../shared/enums/role.enum';  // ❌
```

## Dependency Rules

1. **Shared module** can be imported by any module (it's global)
2. **Feature modules** (auth, events) should not import each other's services directly
3. **Use domain events** for cross-module communication
4. **Entities** can be imported by any module that needs them

```
                    ┌──────────────┐
                    │   Shared     │
                    │  (Global)    │
                    └──────────────┘
                          ↑
            ┌─────────────┼─────────────┐
            ↓             ↓             ↓
      ┌──────────┐  ┌──────────┐  ┌──────────┐
      │   Auth   │  │  Events  │  │   User   │
      └──────────┘  └──────────┘  └──────────┘
```

## Testing Considerations

### Unit Tests

Mock `DomainEventEmitter` in service tests:
```typescript
const mockEventEmitter = {
  emit: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  clearAll: jest.fn(),
};

providers: [
  { provide: DomainEventEmitter, useValue: mockEventEmitter },
]
```

### E2E Tests

Domain events are naturally tested through the integration tests since they're emitted during real service operations.

## Future Improvements

1. **Event handlers**: Add concrete handlers for notifications, analytics
2. **Event persistence**: Store events for replay/audit
3. **Async processing**: Move to message queue for non-critical handlers
4. **Module boundaries**: Extract user module into proper NestJS module with service
5. **API versioning**: Version public APIs to enable independent evolution

## Related Documentation

- [Day 7](day-07.md): Event moderation workflow
- [Day 9](day-09.md): Authorization and RBAC
- [Day 11](day-11.md): CI/CD pipeline
