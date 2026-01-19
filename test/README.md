# Testing Strategy

## Test Types

### Unit Tests
```bash
npm run test              # Run all unit tests
npm run test:watch        # Watch mode
npm run test:cov          # With coverage
```

Located in `src/**/*.spec.ts`

### E2E Tests (CI-Safe)
```bash
npm run test:e2e
```

These tests run in CI and require only a PostgreSQL database:
- `app.e2e-spec.ts` - Basic app functionality
- `events.e2e-spec.ts` - Events CRUD operations
- `rbac.e2e-spec.ts` - Role-based access control
- `moderation.e2e-spec.ts` - Content moderation workflow

**Requirements:**
- PostgreSQL database (provided by CI)
- Environment variables for DB connection

### Microservices Smoke Tests (Local Only)
```bash
# First, start all services
npm run microservices:detach

# Then run the tests
npm run test:e2e:microservices

# Stop services when done
npm run microservices:down
```

Located in `test/microservices-smoke.e2e-spec.ts`

**Requirements:**
- Full docker-compose stack running (Gateway + Auth + Events + PostgreSQL)
- Services accessible at localhost ports 3000-3002

**Why excluded from CI:**
- Requires multiple Docker containers (complex setup)
- Tests inter-service TCP communication
- Designed for local development verification
- Would significantly increase CI time and complexity

## CI Pipeline

The CI pipeline (`.github/workflows/ci.yml`) runs:
1. **Lint** - Code quality checks
2. **Unit Tests** - Fast, isolated tests with coverage
3. **E2E Tests** - Database-dependent tests (excludes microservices)
4. **Build** - Verify successful compilation

## Environment Variables

### Local Development (.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=user
DB_PASSWORD=password
DB_DATABASE=myapp
JWT_SECRET=your-secret-key
```

### CI/CD (.github/workflows/ci.yml)
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=testuser
DB_PASSWORD=testpass
DB_DATABASE=testdb
JWT_SECRET=test-secret-key
```

### Docker Compose (docker-compose.yml)
```env
DB_HOST=postgres
DB_USERNAME=user
DB_PASSWORD=password
DB_DATABASE=myapp
```

## Test Configuration

- `jest.config.js` - Unit test configuration
- `test/jest-e2e.json` - E2E test configuration
  - Excludes `microservices-smoke.e2e-spec.ts` via `testPathIgnorePatterns`
- `test/setup-test-env.ts` - Loads `.env.test` for E2E tests

## Running All Tests Locally

```bash
# Unit tests
npm run test:cov

# E2E tests (requires DB)
npm run test:e2e

# Microservices tests (requires docker-compose)
npm run microservices:detach
npm run test:e2e:microservices
npm run microservices:down
```

## Troubleshooting

### "FATAL: role 'root' does not exist"
Ensure all database connections use environment variables, not hardcoded values:
```typescript
// ❌ Wrong
username: 'root'

// ✅ Correct
username: process.env.DB_USERNAME
```

### Microservices tests failing
Make sure docker-compose is running:
```bash
npm run microservices:detach
# Wait for services to start (check logs)
docker-compose logs -f
```

### E2E tests failing in CI
Check that:
1. PostgreSQL service is running (ci.yml services section)
2. Environment variables match (testuser/testpass/testdb)
3. Migrations are running successfully
4. Test is not trying to use microservices
