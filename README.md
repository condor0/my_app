<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# Microservices Platform - Production Ready

A scalable NestJS microservices architecture with resilience patterns, request tracing, and production-ready infrastructure.

## 🚀 Quick Start

```bash
# Start the entire system with one command
npm run microservices:detach

# Wait for services to be ready (check logs)
npm run microservices:logs

# Verify everything is working
./demo-checklist.ps1          # Windows
bash demo-checklist.sh        # Linux/Mac

# Stop the system
npm run microservices:down
```

## 📚 Documentation

- **[Day 14: Production Readiness](docs/day-14.md)** - Latest features and improvements
- **[Architecture Guide](docs/ARCHITECTURE.md)** - System design and data flow
- **[Production Runbook](docs/RUNBOOK.md)** - Operations guide and troubleshooting
- **[Testing Strategy](test/README.md)** - Test types and CI/CD pipeline

## 🏗️ System Architecture

```
┌─────────────────────────────────────────┐
│        Client Application               │
└────────────────────┬────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
      GET /health  POST /auth  POST /events
         │           │           │
         ▼           ▼           ▼
┌─────────────────────────────────────────┐
│      API Gateway (Port 3000)            │
│  • HTTP routing                         │
│  • Request correlation tracking         │
│  • Resilient RPC with retry logic       │
└─────────────────────────────────────────┘
         │ TCP         │ TCP
         │ (3001)      │ (3002)
         ▼             ▼
    ┌─────────┐   ┌──────────┐
    │  Auth   │   │  Events  │
    │ Service │   │ Service  │
    └────┬────┘   └────┬─────┘
         │             │
         └─────┬───────┘
               │
         ┌─────▼──────────┐
         │  PostgreSQL    │
         │  (Port 5432)   │
         └────────────────┘
```

## ✨ Key Features

### 1. **Resilience Patterns**
- Automatic retry with exponential backoff (3x, up to 5 seconds)
- Request timeouts (10 seconds default)
- Graceful degradation on failures

```typescript
// Automatically retries failed requests
authClient.send(pattern, data).pipe(
  timeout(10000),      // 10 second timeout
  retryWhen(...)       // 3x retry with backoff
);
```

### 2. **Request Tracing**
- Correlation IDs propagate across all services
- Full request path visible in logs
- Unified request tracking

```json
{
  "requestId": "abc-123",
  "correlationId": "abc-123",
  "traceId": "abc-123 -> api-gateway -> auth-service",
  "responseTimeMs": 145
}
```

### 3. **Idempotency**
- Automatic deduplication for command handlers
- Cache with configurable TTL
- Prevents duplicate processing

```typescript
const key = IdempotencyService.generateKey(service, operation, payload);
const cached = await this.idempotencyService.get(key);
if (cached) return cached;  // Return cached result
```

### 4. **Production Logging**
- Structured JSON output
- Request context in all logs
- Performance metrics included

### 5. **Single Command Deployment**
```bash
npm run microservices:detach  # Starts all services
npm run microservices:down    # Stops all services
```

## 📋 API Usage

### Authentication

**Signup**
```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

**Login**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Get Profile**
```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Events

**Create Event**
```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Product Launch",
    "description": "New product release",
    "startDate": "2026-02-01T10:00:00Z",
    "location": "Virtual"
  }'
```

**List Events**
```bash
curl http://localhost:3000/events \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔍 Monitoring

### Health Checks

```bash
# API Gateway
curl http://localhost:3000/health

# Auth Service
curl http://localhost:3001/health

# Events Service
curl http://localhost:3002/health
```

### View Logs

```bash
# All services
npm run microservices:logs

# Specific service
docker logs api-gateway -f
docker logs auth-service -f
docker logs events-service -f
```

### Trace Request by ID

```bash
# See request path through all services
REQUEST_ID="abc-123"
docker logs api-gateway | grep $REQUEST_ID
docker logs auth-service | grep $REQUEST_ID
docker logs events-service | grep $REQUEST_ID
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# E2E tests (requires database)
npm run test:e2e

# Microservices tests (requires docker-compose)
npm run microservices:detach
npm run test:e2e:microservices
npm run microservices:down
```

## 📦 Prerequisites

- Docker & Docker Compose
- Node.js 18+
- npm or yarn

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Format code
npm run format

# Lint
npm run lint
```

## 📝 Project Structure

```
my_app/
├── apps/
│   ├── api-gateway/          # HTTP entry point
│   ├── auth-service/         # User management & JWT
│   └── events-service/       # Event CRUD operations
├── libs/
│   └── contracts/            # Shared types and patterns
├── src/
│   ├── common/              # Shared middleware, interceptors
│   ├── auth/                # Auth module
│   ├── events/              # Events module
│   └── database/            # Migrations, seeds
├── test/                     # E2E tests
├── docs/                     # Documentation
└── docker-compose.yml        # Service orchestration
```

## 🚦 Resilience Features

### Automatic Retry Logic
- Exponential backoff: 100ms, 200ms, 400ms, ...
- Maximum 3 retry attempts
- Maximum 5 second delay between retries

### Timeout Handling
- 10 second default timeout
- Configurable via `RPC_TIMEOUT_MS`
- Returns 503 on persistent failures

### Correlation Tracking
- Every request gets a unique ID
- Propagated through entire system
- Visible in all logs for debugging

## 🔒 Security

- JWT token-based authentication
- Password hashing with argon2
- Role-based access control (RBAC)
- CORS enabled for API Gateway

## 📊 Performance

- Gateway health check: <10ms
- Auth signup: 50-100ms
- Auth login: 100-200ms
- Event creation: 150-300ms

## 🆘 Troubleshooting

See [Production Runbook](docs/RUNBOOK.md) for:
- Common issues and solutions
- Performance tuning
- Backup and recovery
- Monitoring setup

## 📖 Learn More

- [NestJS Documentation](https://docs.nestjs.com)
- [Microservices Guide](https://docs.nestjs.com/microservices/basics)
- [TypeORM Documentation](https://typeorm.io)

## 📄 License

This project is licensed under the UNLICENSED license.
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
