# Day 03: Observability — Logging, Request IDs, and Health Probes

## Overview
Today’s focus was on making the application observable. We implemented structured logging, request tracking via correlation IDs, and infrastructure health probes to ensure the application is ready for production monitoring.

## Technical Decisions

### 1. Structured Logging (Pino)
- **Implementation**: Integrated `nestjs-pino` and `pino-http` to replace standard text logs with JSON-structured logs.
- **Benefit**: Structured logs are machine-readable, making it easier to filter and analyze logs in production environments using tools like ELK or Datadog.

### 2. Request Correlation (x-request-id)
- **Tracing**: Every incoming request is assigned a unique `x-request-id`.
- **Consistency**: This ID is injected into the response headers and attached to every log entry generated during the request lifecycle. This allows us to isolate all logs related to a single specific transaction.

### 3. Execution Timing (Interceptors)
- **LoggingInterceptor**: Created a global interceptor to capture the start and end time of every HTTP request.
- **Visibility**: The interceptor logs the duration (e.g., `Finished in 4ms`), providing immediate feedback on endpoint performance.

### 4. Health Probes (Liveness & Readiness)
- **Liveness (`/health/live`)**: A stub implemented to signal that the application process is running.
- **Readiness (`/health/ready`)**: A stub implemented to signal that the application is ready to accept traffic (e.g., dependencies like DB are connected).
- **Documentation**: Both endpoints are decorated with Swagger metadata for clear API documentation.

---

## Architecture Flow



---

## Running & Verification

### Endpoints
- **Liveness Probe**: `GET /health/live`
- **Readiness Probe**: `GET /health/ready`

### Verification Checklist
1. **Response Headers**: Run `curl -I http://localhost:3000/health` and verify the `x-request-id` exists.
2. **Log Structure**: Verify the terminal outputs JSON objects containing `req`, `res`, and `responseTime`.
3. **Duration Logs**: Verify logs include the custom interceptor message: `GET /health - Finished in Xms`.
4. **Swagger**: Navigate to `http://localhost:3000/api` to see the new health endpoints documented.

---

## Definition of Done Status
- [x] Every request logs requestId and duration.
- [x] `x-request-id` present in all responses.
- [x] Health endpoints exist and are documented in Swagger.