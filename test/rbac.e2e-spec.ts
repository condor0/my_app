import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

describe('RBAC Authorization - Detailed (e2e)', () => {
  let app: INestApplication<App>;
  let userToken: string;
  let moderatorToken: string;
  let adminToken: string;

  const timestamp = Date.now();

  const credentials = {
    user: {
      email: `rbac.user-${timestamp}@test.com`,
      password: 'TestPass123!',
      name: 'RBAC User',
    },
    moderator: {
      email: `rbac.moderator-${timestamp}@test.com`,
      password: 'TestPass123!',
      name: 'RBAC Moderator',
    },
    admin: {
      email: `rbac.admin-${timestamp}@test.com`,
      password: 'TestPass123!',
      name: 'RBAC Admin',
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Clean up test users before running tests
    const dataSource = app.get(DataSource);
    // Delete events for test users first (if any)
    await dataSource.query(
      `DELETE FROM "events" WHERE "ownerId" IN (SELECT id FROM "users" WHERE email LIKE '%@test.com' OR email IN ('user@example.com', 'moderator@example.com', 'admin@example.com'))`,
    );
    await dataSource.query(
      `DELETE FROM "users" WHERE email LIKE '%@test.com' OR email IN ('user@example.com', 'moderator@example.com', 'admin@example.com')`,
    );
  });

  afterAll(async () => {
    await app.close();
  }, 10000);

  describe('Setup: Create test users with different roles', () => {
    it('should create regular user account', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(credentials.user)
        .expect(201);

      expect(response.status).toBe(201);
    });

    it('should create moderator account', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(credentials.moderator)
        .expect(201);

      expect(response.status).toBe(201);

      // Update role to moderator
      const dataSource = app.get(DataSource);
      await dataSource.query(
        `UPDATE "users" SET role = 'moderator' WHERE email = $1`,
        [credentials.moderator.email],
      );
    });

    it('should create admin account', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(credentials.admin)
        .expect(201);

      expect(response.status).toBe(201);

      // Update role to admin
      const dataSource = app.get(DataSource);
      await dataSource.query(
        `UPDATE "users" SET role = 'admin' WHERE email = $1`,
        [credentials.admin.email],
      );
    });

    it('should login user and receive token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: credentials.user.email,
          password: credentials.user.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      userToken = (response.body as { accessToken: string }).accessToken;
    });

    it('should login moderator and receive token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: credentials.moderator.email,
          password: credentials.moderator.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      moderatorToken = (response.body as { accessToken: string }).accessToken;
    });

    it('should login admin and receive token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: credentials.admin.email,
          password: credentials.admin.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      adminToken = (response.body as { accessToken: string }).accessToken;
    });
  });

  describe('Authentication (401 - Unauthorized)', () => {
    it('should return 401 when accessing protected route without Authorization header', () => {
      return request(app.getHttpServer())
        .post('/auth/moderator/content')
        .expect(401);
    });

    it('should return 401 when Authorization header is missing', () => {
      return request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should return 401 with malformed Authorization header (no Bearer prefix)', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'InvalidToken')
        .expect(401);
    });

    it('should return 401 with invalid Bearer token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should return 401 with empty Bearer token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer ')
        .expect(401);
    });

    it('should return 401 with tampered token', () => {
      const tamperedToken = userToken.slice(0, -5) + 'xxxxx';
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);
    });
  });

  describe('Authorization (403 - Forbidden)', () => {
    it('should return 403 when user tries to access admin-only route', async () => {
      return request(app.getHttpServer())
        .delete('/auth/admin/users/1')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 403 when user tries to access moderator-only route', async () => {
      return request(app.getHttpServer())
        .post('/auth/moderator/content')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 403 with helpful error message for insufficient permissions', async () => {
      const response = await request(app.getHttpServer())
        .delete('/auth/admin/users/1')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect((response.body as { message: string }).message).toContain(
        'permission',
      );
    });
  });

  describe('Authorization (200 - Allowed)', () => {
    it('should allow user to access /auth/me route', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect((response.body as { email: string }).email).toBe(
        credentials.user.email,
      );
      expect((response.body as { role: string }).role).toBe('user');
    });

    it('should allow moderator to access /auth/moderator/content route', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/moderator/content')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect((response.body as { message: string }).message).toContain(
        'moderator',
      );
    });

    it('should allow admin to access /auth/moderator/content route (admin has all permissions)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/moderator/content')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect((response.body as { message: string }).message).toContain('admin');
    });

    it('should allow admin to access /auth/admin/users/:id route', async () => {
      const response = await request(app.getHttpServer())
        .delete('/auth/admin/users/999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect((response.body as { message: string }).message).toContain('admin');
    });

    it('should NOT allow moderator to access admin-only route', async () => {
      return request(app.getHttpServer())
        .delete('/auth/admin/users/1')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(403);
    });
  });

  describe('Token validation across different scenarios', () => {
    it('should verify role is included in user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('role');
      expect(['user', 'moderator', 'admin']).toContain(
        (response.body as { role: string }).role,
      );
    });

    it('should maintain role consistency across multiple requests', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(200);

      expect((response1.body as { role: string }).role).toBe(
        (response2.body as { role: string }).role,
      );
    });
  });
});
