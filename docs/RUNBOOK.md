# PRODUCTION RUNBOOK

## Quick Start

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

## System Components

| Service | Port | Role |
|---------|------|------|
| API Gateway | 3000 | HTTP entry point, routing, auth |
| Auth Service | 3001 | User management, JWT tokens |
| Events Service | 3002 | Event CRUD operations |
| PostgreSQL | 5432 | Data persistence |

## Health Checks

```bash
# All services
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health

# Expected response
{"status":"ok","timestamp":"2026-01-21T10:00:00Z"}
```

## Common Operations

### View Logs

```bash
# All services
npm run microservices:logs

# Specific service
docker logs api-gateway -f
docker logs auth-service -f
docker logs events-service -f
docker logs my_app-postgres-1 -f

# By log level
docker logs api-gateway | grep "ERROR"
docker logs api-gateway | grep "WARN"

# By timestamp
docker logs api-gateway --since 5m       # Last 5 minutes
docker logs api-gateway --until 1m       # Until 1 minute ago
```

### Monitor Performance

```bash
# Response times from logs
npm run microservices:logs | grep "responseTime"

# Retry attempts
npm run microservices:logs | grep "retrying"

# Cache hits
npm run microservices:logs | grep "cached result"
```

### Find a Specific Request

```bash
# By request ID
REQUEST_ID="abc-123"
docker logs api-gateway | grep $REQUEST_ID
docker logs auth-service | grep $REQUEST_ID
docker logs events-service | grep $REQUEST_ID

# Result: See request path through all services
```

### Database Operations

```bash
# Connect to database
docker exec -it my_app-postgres-1 psql -U user -d myapp

# In psql shell:
\d                        # List all tables
SELECT * FROM "user";     # View users
SELECT * FROM event;      # View events
SELECT COUNT(*) FROM event WHERE "organizationId" = 1;

# Useful queries
SELECT email, created_at FROM "user" ORDER BY created_at DESC LIMIT 10;
SELECT title, status, created_at FROM event ORDER BY created_at DESC LIMIT 10;
```

### Restart Services

```bash
# Graceful restart (stops and starts with rebuilds)
npm run microservices:down
npm run microservices:detach

# Or restart individual service
docker-compose up -d api-gateway --build

# Force rebuild (clear cache)
docker-compose up --build -d --force-recreate
```

### View Docker Resources

```bash
# Running containers
docker ps

# Resource usage
docker stats

# Network inspection
docker network ls
docker network inspect my_app_default

# Volume inspection
docker volume ls
```

## Troubleshooting

### Service Not Responding

**Symptom**: `curl http://localhost:3000/health` fails

**Diagnosis**:
```bash
# Check if container is running
docker ps | grep api-gateway

# Check if port is in use
lsof -i :3000                    # Mac/Linux
netstat -ano | findstr :3000    # Windows

# View service logs for errors
docker logs api-gateway -f
```

**Solution**:
```bash
# Restart the service
docker-compose restart api-gateway

# Or rebuild from scratch
docker-compose up -d api-gateway --build --force-recreate
```

### Timeout Errors

**Symptom**: `Auth service temporarily unavailable` in logs

**Diagnosis**:
```bash
# Check if Auth Service is running
curl http://localhost:3001/health

# Check response times
docker logs api-gateway | grep "responseTimeMs"
```

**Solution**:
```bash
# Increase timeout (in .env)
RPC_TIMEOUT_MS=20000  # 20 seconds instead of 10

# Or restart slow service
docker-compose restart auth-service
```

### Database Connection Errors

**Symptom**: `Cannot connect to postgres`

**Diagnosis**:
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Try direct connection
docker exec -it my_app-postgres-1 pg_isready
```

**Solution**:
```bash
# Restart database
docker-compose up -d postgres

# Or full reset (WARNING: loses data)
docker-compose down -v
npm run microservices:detach
```

### High Memory Usage

**Symptom**: Container crashes or `OOMKilled`

**Diagnosis**:
```bash
# Check memory usage
docker stats

# Check for memory leaks in logs
docker logs api-gateway | grep -i "memory\|leak"
```

**Solution**:
```bash
# Restart service to clear memory
docker-compose restart api-gateway

# Monitor memory after restart
docker stats api-gateway
```

### Duplicate Events Created

**Symptom**: Same event created multiple times

**Diagnosis**:
```bash
# Check database for duplicates
docker exec -it my_app-postgres-1 psql -U user -d myapp
SELECT * FROM event WHERE title = 'My Event' AND created_at > NOW() - INTERVAL '1 minute';
```

**Solution**:
```bash
# Idempotency is automatically enabled
# Wait 1 hour for cache to expire, or restart service:
docker-compose restart events-service
```

### Slow API Responses

**Symptom**: All requests taking >1000ms

**Diagnosis**:
```bash
# Check response times by endpoint
docker logs api-gateway | grep "POST /events" | grep "responseTime"

# Check if a specific service is slow
docker logs events-service | grep "responseTime"

# Check database query performance
docker exec -it my_app-postgres-1 psql -U user -d myapp
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;
```

**Solution**:
```bash
# Check service logs for errors
docker logs events-service -f

# Restart slow service
docker-compose restart events-service

# Check database connections
docker exec -it my_app-postgres-1 psql -U user -d myapp -c "SELECT * FROM pg_stat_activity;"
```

### Correlation IDs Not in Logs

**Symptom**: No requestId, correlationId in log output

**Diagnosis**:
```bash
# Check if middleware is enabled
grep -r "CorrelationIdMiddleware" src/

# Check app.module.ts
cat src/app.module.ts | grep -A5 "configure"
```

**Solution**:
```bash
# Middleware should be auto-enabled in main app
# If not, add to each service's main.ts or app.module
# Restart services to pick up changes
npm run microservices:down
npm run microservices:detach
```

### Too Many Retries

**Symptom**: Logs show multiple retry attempts for same request

**Diagnosis**:
```bash
# Check network connectivity
ping localhost

# Check if service is actually slow
docker logs auth-service | tail -50
```

**Solution**:
```bash
# Reduce max retries (in gateway.module.ts)
maxReconnectAttempts: 2  // From 5

# Or increase initial timeout
timeout: 15000  // From 10000

# Restart gateway
docker-compose restart api-gateway
```

## Monitoring Dashboard

Create a simple monitoring script:

```bash
#!/bin/bash
watch -n 5 '
  echo "=== Services Status ==="
  curl -s http://localhost:3000/health | grep status
  curl -s http://localhost:3001/health | grep status
  curl -s http://localhost:3002/health | grep status
  echo ""
  echo "=== Recent Errors (last 10 minutes) ==="
  docker logs --since 10m api-gateway 2>&1 | grep ERROR | tail -3
  echo ""
  echo "=== Request Times (last 100 requests) ==="
  docker logs --tail 100 api-gateway 2>&1 | grep responseTime | tail -3
'
```

Save as `monitor.sh` and run:
```bash
chmod +x monitor.sh
./monitor.sh
```

## Deployment Checklist

Before deploying to production:

- [ ] All tests pass: `npm run test:cov`
- [ ] E2E tests pass: `npm run test:e2e`
- [ ] Microservices tests pass: `npm run test:e2e:microservices`
- [ ] Linting passes: `npm run lint`
- [ ] Demo checklist passes: `./demo-checklist.ps1`
- [ ] Environment variables set correctly
- [ ] Database migrations run: `npm run migration:run`
- [ ] Logs are being generated
- [ ] Correlation IDs in logs
- [ ] No memory leaks (monitor for 1 hour)
- [ ] Response times are acceptable (<200ms for /events)
- [ ] Retry logic working (simulate network failure)
- [ ] Database backups configured
- [ ] Error alerting configured

## Environment Variables Reference

```env
# Gateway
RPC_TIMEOUT_MS=10000              # RPC call timeout in ms
AUTH_SERVICE_HOST=localhost
AUTH_SERVICE_PORT=3001
EVENTS_SERVICE_HOST=localhost
EVENTS_SERVICE_PORT=3002

# All Services
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=user
DB_PASSWORD=password
DB_DATABASE=myapp

# Auth & Security
JWT_SECRET=your-secret-key
JWT_EXPIRY=3600                   # Token expiry in seconds

# Logging
NODE_ENV=development              # or production
SERVICE_NAME=api-gateway          # For logging

# Database
DB_LOGGING=false                  # TypeORM query logging
```

## Performance Tuning

### Increase Concurrency

```bash
# Edit docker-compose.yml
api-gateway:
  environment:
    NODE_ENV: production
    NODE_OPTIONS: --max-old-space-size=1024
```

### Database Connection Pool

```bash
# Edit .env
DB_POOL_SIZE=10
DB_POOL_TIMEOUT=30000
```

### Retry Strategy Tuning

```typescript
// In gateway.module.ts
maxReconnectAttempts: 3,          // Reduce for speed
reconnectDelay: 100,               // Reduce for faster retry
timeout: 5000,                     // Reduce to fail faster
```

## Backup & Recovery

### Backup Database

```bash
# Full backup
docker exec my_app-postgres-1 pg_dump -U user myapp > backup_$(date +%Y%m%d).sql

# With compression
docker exec my_app-postgres-1 pg_dump -U user -F c myapp > backup_$(date +%Y%m%d).dump
```

### Restore Database

```bash
# From SQL dump
docker exec -i my_app-postgres-1 psql -U user myapp < backup_20260121.sql

# From binary dump
docker exec -i my_app-postgres-1 pg_restore -U user -d myapp backup_20260121.dump
```

## Cleanup & Maintenance

```bash
# Remove old logs
docker logs --since 7d api-gateway > /dev/null  # Keeps only last 7 days

# Clean up unused images
docker image prune -a

# Clean up unused volumes
docker volume prune

# Full cleanup (WARNING: removes all data)
docker-compose down -v
```

## Support

For issues, check:
1. Logs: `npm run microservices:logs`
2. Health: Health check endpoints
3. Correlation IDs: Search by requestId in logs
4. Documentation: [docs/day-14.md](day-14.md)
5. Architecture: [docs/ARCHITECTURE.md](ARCHITECTURE.md)
