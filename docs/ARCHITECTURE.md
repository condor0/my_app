# MICROSERVICES ARCHITECTURE GUIDE

## System Overview

This is a production-ready NestJS microservices architecture with:

- **3 Independent Services**: API Gateway, Auth Service, Events Service
- **TCP Inter-service Communication**: Fast, binary protocol
- **Resilience Patterns**: Retry, timeout, circuit breaker ready
- **Request Tracing**: Correlation IDs across all services
- **Production Logging**: Structured JSON logs with context
- **Idempotency**: Duplicate request deduplication

## Architecture Diagram

```
                                    ┌──────────────────────┐
                                    │  Client Application  │
                                    └──────────┬───────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
            HTTP GET /health          HTTP POST /auth/login     HTTP POST /events
                    │                          │                          │
                    ▼                          ▼                          ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                           API GATEWAY (Port 3000)                        │
    │                                                                          │
    │  ┌─────────────────────────────────────────────────────────────────┐  │
    │  │  CorrelationIdMiddleware                                        │  │
    │  │  - Generates or retrieves x-request-id                         │  │
    │  │  - Tracks x-correlation-id for request chains                 │  │
    │  │  - Builds x-trace-id: gateway -> service -> service           │  │
    │  └────────────┬───────────────────────────────────────────────────┘  │
    │               │                                                       │
    │  ┌────────────▼───────────────────────────────────────────────────┐  │
    │  │  LoggingInterceptor                                            │  │
    │  │  - Logs all HTTP requests with correlation context            │  │
    │  │  - Records response time and status                           │  │
    │  │  - Structured JSON format for log aggregation                 │  │
    │  └────────────┬───────────────────────────────────────────────────┘  │
    │               │                                                       │
    │  ┌────────────▼──────────────────┐  ┌────────────────────────────┐ │
    │  │  AuthController              │  │  EventsController          │ │
    │  │  - POST /auth/signup          │  │  - POST /events            │ │
    │  │  - POST /auth/login           │  │  - GET /events             │ │
    │  │  - GET /auth/profile          │  │  - PATCH /events/:id       │ │
    │  │  - Forwards to TCP service    │  │  - Attaches user context   │ │
    │  └────────────┬──────────────────┘  └────────────┬───────────────┘ │
    │               │                                   │                  │
    │  TCP with Resilience:                TCP with Resilience:          │
    │  • 3x retry with exponential backoff  • 3x retry with exponential  │
    │  • 10 second timeout                  • 10 second timeout          │
    │  • Automatic connection pooling       • Automatic recovery         │
    │               │                                   │                  │
    └───────────────┼───────────────────────────────────┼──────────────────┘
                    │                                   │
         ┌──────────▼─────────────┐      ┌──────────────▼──────────┐
         │                        │      │                         │
         ▼                        ▼      ▼                         ▼
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
    │  Auth Service    │  │  Events Service  │  │  PostgreSQL Database │
    │  (Port 3001)     │  │  (Port 3002)     │  │  (Port 5432)         │
    │                  │  │                  │  │                      │
    │  Controllers:    │  │  Controllers:    │  │  - All data storage  │
    │  - Signup        │  │  - Create        │  │  - Shared by all     │
    │  - Login         │  │  - List          │  │    services          │
    │  - Validate      │  │  - Update        │  │  - TypeORM ORM       │
    │                  │  │  - Delete        │  │  - Migrations        │
    │  Services:       │  │                  │  │                      │
    │  - User mgmt     │  │  Services:       │  │  Entities:           │
    │  - Password hash │  │  - Event CRUD    │  │  - User              │
    │  - JWT tokens    │  │  - Permissions   │  │  - Organization      │
    │  - Roles/Perms   │  │  - Idempotency   │  │  - Event             │
    │                  │  │                  │  │  - RolePermission    │
    │  Logging:        │  │  Logging:        │  │                      │
    │  - Correlation   │  │  - Correlation   │  │                      │
    │    context       │  │    context       │  │                      │
    │  - Request ID    │  │  - Request ID    │  │                      │
    │  - Trace path    │  │  - Trace path    │  │                      │
    └──────────────────┘  └──────────────────┘  └──────────────────────┘
```

## Key Components

### 1. CorrelationIdMiddleware

**Purpose**: Establish request tracing across services

**Headers**:
```
x-request-id: Unique ID for this specific request
x-correlation-id: Root request ID (same for entire request chain)
x-trace-id: Full path showing service traversal
```

**Example**:
```
Request 1: Client -> Gateway
  x-request-id: abc-123
  x-correlation-id: abc-123
  x-trace-id: abc-123 -> api-gateway

Gateway calls Auth Service
  x-request-id: abc-123
  x-correlation-id: abc-123
  x-trace-id: abc-123 -> api-gateway -> auth-service

Auth Service responds
  All logs include requestId, correlationId, traceId
```

### 2. LoggingInterceptor

**Purpose**: Log all HTTP traffic with correlation context

**Log Structure**:
```json
{
  "level": "info",
  "msg": "HTTP Request Completed",
  "requestId": "abc-123",
  "correlationId": "abc-123",
  "traceId": "abc-123 -> api-gateway",
  "service": "api-gateway",
  "method": "POST",
  "url": "/auth/login",
  "statusCode": 200,
  "responseTimeMs": 145
}
```

### 3. Resilient RPC Client

**Purpose**: Handle transient failures in inter-service communication

**Retry Strategy**:
```
Attempt 1: Immediate (0ms delay)
  ├─ Fails with connection error
  └─ Wait 100ms, retry

Attempt 2: After 100ms
  ├─ Fails with timeout
  └─ Wait 200ms (exponential backoff), retry

Attempt 3: After 300ms total
  ├─ Succeeds
  └─ Return result

Total time: ~300ms (faster than failing immediately)
```

**Timeout**:
- Default: 10 seconds per RPC call
- Configurable via `RPC_TIMEOUT_MS` environment variable
- Each retry gets full timeout window

### 4. Idempotency Service

**Purpose**: Prevent duplicate request processing

**Cache Key**:
```
Format: {service}:{operation}:{payload_hash}

Example: 
  events-service:create-event:a1b2c3d4e5f6...
  (hash of {userId, title, organizationId})
```

**TTL**:
- Default: 3600 seconds (1 hour)
- Configurable per operation
- Automatic cleanup of expired entries

## Request Flow Example: Create Event

```
1. Client Request
   POST /events
   Headers: Authorization: Bearer TOKEN
           x-request-id: req-123

2. Gateway - CorrelationIdMiddleware
   ├─ Receives request
   ├─ Generates or retrieves x-request-id: req-123
   ├─ Stores in req.requestId
   └─ Calls next()

3. Gateway - LoggingInterceptor
   ├─ Records start time
   ├─ Includes correlation IDs
   └─ Calls controller

4. EventsController
   ├─ Extracts token, validates auth
   ├─ Attaches userId to payload
   ├─ Sends TCP message to Events Service:
   │  Pattern: EVENTS_PATTERNS.CREATE
   │  Payload: {title, description, userId, organizationId}
   │  Headers: x-request-id, x-correlation-id (passed in metadata)
   └─ Waits for response (with 10s timeout)

5. TCP Transport (with resilience)
   ├─ Attempt 1: Send message to localhost:3002
   ├─ Wait for response (10s timeout)
   ├─ If fails: exponential backoff retry (max 3 times)
   └─ Return response or throw error

6. Events Service - MessageHandler
   ├─ Receives CREATE message
   ├─ Extracts correlation IDs from metadata
   ├─ Checks idempotency cache:
   │  Key: events-service:create-event:{hash}
   │  └─ If cached, return cached result
   ├─ Validates payload
   ├─ Inserts event into database
   ├─ Caches result (TTL: 3600s)
   └─ Returns response

7. Events Service - Logging
   ├─ Logs: "Event created"
   ├─ Includes: requestId, correlationId, traceId
   ├─ Includes: responseTimeMs, eventId
   └─ Sends to stdout (aggregated by docker-compose)

8. Gateway Response
   ├─ Receives result from Events Service
   ├─ LoggingInterceptor logs completion
   ├─ Returns HTTP 201
   ├─ Headers: x-request-id, x-correlation-id, x-trace-id
   └─ Body: Event data

9. Client Receives
   HTTP/1.1 201 Created
   x-request-id: req-123
   x-correlation-id: req-123
   x-trace-id: req-123 -> api-gateway -> events-service
   
   {
     "id": 1,
     "title": "...",
     "status": "draft",
     ...
   }

10. End-to-End Tracing
    grep "req-123" docker logs
    ├─ api-gateway: "Received POST /events"
    ├─ api-gateway: "Sent to events-service"
    ├─ events-service: "Created event id=1"
    ├─ events-service: "Cached result"
    └─ api-gateway: "Event created, responded to client"
```

## Data Flow: Authentication

```
Client
  │
  ├─ POST /auth/signup
  │  └─ Data: email, password, name
  │
  ├─ API Gateway
  │  ├─ CorrelationIdMiddleware: Attach IDs
  │  ├─ SignupDto validation
  │  ├─ Send to Auth Service (TCP)
  │  └─ Return result to client
  │
  └─ Auth Service
     ├─ Validate email not in use
     ├─ Hash password with argon2
     ├─ Insert User entity in PostgreSQL
     ├─ Return success
     └─ Log: requestId, correlationId, traceId

Then:

Client (with token)
  │
  ├─ POST /auth/login
  │  └─ Data: email, password
  │
  ├─ API Gateway
  │  ├─ CorrelationIdMiddleware: Attach IDs
  │  ├─ LoginDto validation
  │  ├─ Send to Auth Service (TCP)
  │  │  └─ With retry & timeout
  │  └─ Return JWT token
  │
  └─ Auth Service
     ├─ Load user by email
     ├─ Verify password hash
     ├─ Generate JWT token (signed)
     ├─ Return token with expiry
     └─ Log: requestId, correlationId, traceId

Client (with JWT)
  │
  ├─ GET /events
  │  ├─ Header: Authorization: Bearer JWT_TOKEN
  │  └─ Header: x-request-id: (optional)
  │
  ├─ API Gateway
  │  ├─ CorrelationIdMiddleware: Attach/propagate IDs
  │  ├─ AuthGuard: Verify JWT locally
  │  │  └─ Attach user to request
  │  ├─ EventsController: Attach userId to payload
  │  ├─ Send to Events Service (TCP)
  │  └─ Return events list
  │
  └─ Events Service
     ├─ Find events for organizationId
     ├─ Filter by status
     ├─ Return list
     └─ Log: requestId, correlationId, traceId
```

## Error Handling & Resilience

### Network Failures

```
Client -> Gateway -> Auth Service (fails)

Attempt 1: Connection refused
  └─ Wait 100ms

Attempt 2: Connection timeout
  └─ Wait 200ms

Attempt 3: Service responds with error
  └─ Gateway returns 500 to client

If Attempt 3 succeeds:
  └─ Return result, no error to client
```

### Timeout Handling

```
Gateway timeout: 10 seconds

Scenario: Auth Service is slow
1. Request sent at t=0
2. Service processing...
3. At t=10s: Timeout occurs
4. Exception thrown
5. Retries on next attempt (backoff)
6. After 3 failed retries: Return 503 to client
```

### Idempotency Protection

```
Client sends: Create Event (accidental duplicate)

First request:
  1. Check cache: Not found
  2. Create event in database
  3. Store result in cache (TTL: 1 hour)
  4. Return result to client

Second request (within 1 hour):
  1. Check cache: Found!
  2. Return cached result
  3. No duplicate in database
  4. Same result as first request
  5. Idempotent ✓

After 1 hour cache expires:
  1. Check cache: Expired
  2. Create new event (allowed)
  3. Store result in cache
  4. Return result to client
```

## Database Schema

```
┌─────────────────┐
│  User           │
├─────────────────┤
│ id (PK)         │
│ email (unique)  │
│ password_hash   │
│ name            │
│ role            │
│ organizationId  ├─────┐
│ createdAt       │     │
│ updatedAt       │     │
└─────────────────┘     │
                        │
                   ┌────▼──────────────┐
                   │  Organization     │
                   ├───────────────────┤
                   │ id (PK)           │
                   │ name              │
                   │ createdAt         │
                   └───────────────────┘

┌─────────────────┐
│  Event          │
├─────────────────┤
│ id (PK)         │
│ title           │
│ description     │
│ startDate       │
│ location        │
│ status          │ (draft, published, archived)
│ userId (FK)     ├─────────┐
│ organizationId  │         │
│ createdAt       │         │
│ updatedAt       │         │
└─────────────────┘         │
                      ┌─────▼─────┐
                      │ User (FK) │
                      └───────────┘
```

## Performance Optimization Tips

1. **Connection Pooling**: TCP connections are pooled automatically
2. **Caching**: Idempotency cache reduces duplicate processing
3. **Logging**: Structured JSON reduces serialization overhead
4. **Timeout Tuning**: Adjust `RPC_TIMEOUT_MS` based on network conditions
5. **Retry Strategy**: Balance reliability vs. latency

## Monitoring Checklist

- [ ] Health checks for all 3 services
- [ ] Correlation IDs in all logs
- [ ] Response times increasing (detection of slow service)
- [ ] Retry rate (high retry = potential issues)
- [ ] Cache hit rate for idempotency
- [ ] Database connection pool status
- [ ] Service availability (uptime)

## Next Steps

- Implement Jaeger distributed tracing
- Add Prometheus metrics
- Deploy circuit breaker pattern
- Use Redis for distributed idempotency
- Add API rate limiting
- Implement caching layer (Redis)
