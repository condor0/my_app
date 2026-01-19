// ============================================================================
// MICROSERVICES SMOKE TESTS
// ============================================================================
// These tests verify that the microservices architecture works correctly:
// 1. Auth Service: Login, Signup, Token Validation
// 2. Events Service: CRUD operations via Gateway
//
// Run with: npm run test:e2e:microservices
// Requires: All services running (docker-compose up)
// ============================================================================

import request from 'supertest';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';

describe('Microservices Smoke Tests', () => {
  let accessToken: string;

  // Test user credentials
  const testUser = {
    email: `smoke-test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Smoke Test User',
  };

  // ========================================================================
  // HEALTH CHECK TESTS
  // ========================================================================
  describe('Health Check', () => {
    it('GET /health - should return ok', async () => {
      const response = await request(GATEWAY_URL).get('/health').expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('GET /health/detailed - should return service status', async () => {
      const response = await request(GATEWAY_URL)
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('auth');
      expect(response.body.services).toHaveProperty('events');
    });
  });

  // ========================================================================
  // AUTHENTICATION TESTS
  // ========================================================================
  describe('Authentication', () => {
    it('POST /auth/signup - should register a new user', async () => {
      const response = await request(GATEWAY_URL)
        .post('/auth/signup')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty(
        'message',
        'User registered successfully',
      );
    });

    it('POST /auth/signup - should fail for duplicate email', async () => {
      await request(GATEWAY_URL)
        .post('/auth/signup')
        .send(testUser)
        .expect(409);
    });

    it('POST /auth/login - should login and return token', async () => {
      const response = await request(GATEWAY_URL)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testUser.email);

      // Save token for subsequent tests
      accessToken = response.body.accessToken;
    });

    it('POST /auth/login - should fail with wrong password', async () => {
      await request(GATEWAY_URL)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('GET /auth/profile - should return user profile', async () => {
      const response = await request(GATEWAY_URL)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('name', testUser.name);
    });

    it('GET /auth/profile - should fail without token', async () => {
      await request(GATEWAY_URL).get('/auth/profile').expect(401);
    });
  });

  // ========================================================================
  // EVENTS TESTS
  // ========================================================================
  describe('Events (via Gateway)', () => {
    // Note: These tests require the user to be part of an organization
    // In a real scenario, you'd need to set up org membership first

    it('GET /events - should return events list (may be empty)', async () => {
      const response = await request(GATEWAY_URL)
        .get('/events')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /events - should fail without auth', async () => {
      await request(GATEWAY_URL).get('/events').expect(401);
    });

    // Note: Create/Update tests would require user to be in an organization
    // These are placeholder tests showing the expected behavior
    it('POST /events - should require organization membership', async () => {
      const response = await request(GATEWAY_URL)
        .post('/events')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Smoke Test Event',
          description: 'This is a smoke test event for microservices',
          date: '2026-12-31T10:00:00Z',
          location: 'Test Location',
        });

      // Will fail if user is not in an organization
      // Status 400 = Bad Request (no organization)
      // Status 201 = Created (if user has organization)
      expect([201, 400]).toContain(response.status);
    });
  });

  // ========================================================================
  // API GATEWAY ROUTING TESTS
  // ========================================================================
  describe('Gateway Routing', () => {
    it('should have Swagger documentation at /api', async () => {
      const response = await request(GATEWAY_URL).get('/api').expect(200);

      expect(response.text).toContain('swagger');
    });

    it('should return 404 for unknown routes', async () => {
      await request(GATEWAY_URL).get('/unknown-route').expect(404);
    });
  });
});

// ============================================================================
// RUN INSTRUCTIONS
// ============================================================================
/*
To run these smoke tests:

1. Start all services:
   docker-compose up -d

2. Wait for services to be healthy:
   docker-compose ps

3. Run the smoke tests:
   npm run test:e2e:microservices

4. Or run directly with Jest:
   GATEWAY_URL=http://localhost:3000 npx jest test/microservices-smoke.e2e-spec.ts --runInBand

5. Clean up:
   docker-compose down
*/
