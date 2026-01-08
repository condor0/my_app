import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

describe('Event Moderation Workflow (e2e)', () => {
  let app: INestApplication<App>;
  let userToken: string;
  let moderatorToken: string;
  let adminToken: string;
  let eventId: number;

  const testUser = {
    email: 'workflow-user@test.com',
    password: 'Password123!',
    name: 'Workflow User',
  };

  const testModerator = {
    email: 'moderator@test.com',
    password: 'Password123!',
    name: 'Test Moderator',
  };

  const testAdmin = {
    email: 'admin@test.com',
    password: 'Password123!',
    name: 'Test Admin',
  };

  const testOrg = {
    name: 'Workflow Test Org',
  };

  const testEvent = {
    title: 'Moderation Test Event',
    description: 'This is a test event for moderation workflow',
    date: '2026-12-31T10:00:00Z',
    location: 'Test Location',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        stopAtFirstError: true,
        skipMissingProperties: false,
      }),
    );
    await app.init();

    // Clean up test data
    const dataSource = app.get(DataSource);
    await dataSource.query(
      `DELETE FROM "events" WHERE "ownerId" IN (SELECT id FROM "users" WHERE email LIKE '%@test.com')`,
    );
    await dataSource.query(`DELETE FROM "users" WHERE email LIKE '%@test.com'`);
    await dataSource.query(
      `DELETE FROM "organizations" WHERE name = '${testOrg.name}'`,
    );

    // Create organization
    const orgQueryResult = await dataSource.query(
      `INSERT INTO "organizations" (name) VALUES ('${testOrg.name}') RETURNING id`,
    );

    const orgId = orgQueryResult[0].id;

    // Create user
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(testUser)
      .expect(201);

    await dataSource.query(
      `UPDATE "users" SET "organizationId" = ${orgId} WHERE email = '${testUser.email}'`,
    );

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    userToken = (loginResponse.body as { accessToken: string }).accessToken;

    // Create moderator
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(testModerator)
      .expect(201);

    await dataSource.query(
      `UPDATE "users" SET "organizationId" = ${orgId}, role = 'moderator' WHERE email = '${testModerator.email}'`,
    );

    const modLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testModerator.email, password: testModerator.password })
      .expect(200);

    moderatorToken = (modLoginResponse.body as { accessToken: string })
      .accessToken;

    // Create admin
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(testAdmin)
      .expect(201);

    await dataSource.query(
      `UPDATE "users" SET "organizationId" = ${orgId}, role = 'admin' WHERE email = '${testAdmin.email}'`,
    );

    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testAdmin.email, password: testAdmin.password })
      .expect(200);

    adminToken = (adminLoginResponse.body as { accessToken: string })
      .accessToken;
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);
    await dataSource.query(
      `DELETE FROM "events" WHERE "ownerId" IN (SELECT id FROM "users" WHERE email LIKE '%@test.com')`,
    );
    await dataSource.query(`DELETE FROM "users" WHERE email LIKE '%@test.com'`);
    await dataSource.query(
      `DELETE FROM "organizations" WHERE name = '${testOrg.name}'`,
    );

    await app.close();
  }, 10000);

  describe('State Transitions', () => {
    it('should create event in draft status', async () => {
      const response = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${userToken}`)
        .send(testEvent)
        .expect(201);

      expect((response.body as { status: string }).status).toBe('draft');
      eventId = (response.body as { id: number }).id;
    });

    it('should submit event (draft -> pending)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/events/${eventId}/submit`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect((response.body as { status: string }).status).toBe('pending');
    });

    it('should return 409 when submitting non-draft event', async () => {
      const response = await request(app.getHttpServer())
        .post(`/events/${eventId}/submit`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(409);

      expect((response.body as { message: string }).message).toContain(
        'Only draft events can be submitted',
      );
    });

    it('should return 403 when regular user tries to approve', () => {
      return request(app.getHttpServer())
        .post(`/events/${eventId}/approve`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should approve event as moderator (pending -> published)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/events/${eventId}/approve`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(200);

      expect((response.body as { status: string }).status).toBe('published');
    });

    it('should return 409 when approving non-pending event', async () => {
      const response = await request(app.getHttpServer())
        .post(`/events/${eventId}/approve`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(409);

      expect((response.body as { message: string }).message).toContain(
        'Only pending events can be approved',
      );
    });
  });

  describe('Reject Workflow', () => {
    it('should return 400 when rejecting without reason', async () => {
      // Create and submit fresh event
      const createResponse = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Event for No Reason Test',
          description: 'Event to test rejection without reason',
          date: '2026-12-31T10:00:00Z',
          location: 'Test Location',
        })
        .expect(201);

      const testEventId = (createResponse.body as { id: number }).id;

      await request(app.getHttpServer())
        .post(`/events/${testEventId}/submit`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      return request(app.getHttpServer())
        .post(`/events/${testEventId}/reject`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({})
        .expect(400);
    });

    it('should return 400 when reject reason is too short', async () => {
      // Create and submit fresh event
      const createResponse = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Event for Short Reason Test',
          description: 'Event to test rejection with short reason',
          date: '2026-12-31T10:00:00Z',
          location: 'Test Location',
        })
        .expect(201);

      const testEventId = (createResponse.body as { id: number }).id;

      await request(app.getHttpServer())
        .post(`/events/${testEventId}/submit`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      return request(app.getHttpServer())
        .post(`/events/${testEventId}/reject`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({ rejectReason: 'short' })
        .expect(400);
    });

    it('should reject event as admin (pending -> rejected)', async () => {
      // Create and submit fresh event
      const createResponse = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Event for Admin Reject Test',
          description: 'Event to be rejected by admin successfully',
          date: '2026-12-31T10:00:00Z',
          location: 'Test Location',
        })
        .expect(201);

      const testEventId = (createResponse.body as { id: number }).id;

      await request(app.getHttpServer())
        .post(`/events/${testEventId}/submit`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .post(`/events/${testEventId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectReason: 'Event content violates community guidelines',
        })
        .expect(200);

      expect((response.body as { status: string }).status).toBe('rejected');
      expect((response.body as { rejectReason: string }).rejectReason).toBe(
        'Event content violates community guidelines',
      );
    });

    it('should return 409 when rejecting non-pending event', async () => {
      // Create fresh event in draft status
      const createResponse = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Event for Double Reject Test',
          description: 'Event to test rejecting already rejected event',
          date: '2026-12-31T10:00:00Z',
          location: 'Test Location',
        })
        .expect(201);

      const testEventId = (createResponse.body as { id: number }).id;

      // Submit and reject
      await request(app.getHttpServer())
        .post(`/events/${testEventId}/submit`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/events/${testEventId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectReason: 'First rejection reason',
        })
        .expect(200);

      // Try to reject again
      const response = await request(app.getHttpServer())
        .post(`/events/${testEventId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectReason: 'Another reason',
        })
        .expect(409);

      expect((response.body as { message: string }).message).toContain(
        'Only pending events can be rejected',
      );
    });
  });

  describe('Authorization Tests', () => {
    let authEventId: number;

    beforeEach(async () => {
      // Create fresh event for each test
      const response = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Auth Test Event',
          description: 'Event for authorization testing',
          date: '2026-12-31T10:00:00Z',
          location: 'Auth Location',
        })
        .expect(201);

      authEventId = (response.body as { id: number }).id;
    });

    it('should return 401 when submitting without token', () => {
      return request(app.getHttpServer())
        .post(`/events/${authEventId}/submit`)
        .expect(401);
    });

    it('should return 401 when approving without token', () => {
      return request(app.getHttpServer())
        .post(`/events/${authEventId}/approve`)
        .expect(401);
    });

    it('should return 401 when rejecting without token', () => {
      return request(app.getHttpServer())
        .post(`/events/${authEventId}/reject`)
        .send({ rejectReason: 'Invalid event' })
        .expect(401);
    });

    it('should return 403 when regular user tries to reject', async () => {
      // Submit first
      await request(app.getHttpServer())
        .post(`/events/${authEventId}/submit`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Try to reject
      return request(app.getHttpServer())
        .post(`/events/${authEventId}/reject`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ rejectReason: 'User cannot reject events' })
        .expect(403);
    });
  });

  describe('Edge Cases', () => {
    it('should return 404 when operating on non-existent event', () => {
      return request(app.getHttpServer())
        .post('/events/99999/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should not allow updating published events', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/events/${eventId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Updated Title' })
        .expect(403);

      expect((response.body as { message: string }).message).toContain(
        'Only draft events can be updated',
      );
    });

    it('should not allow deleting published events', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/events/${eventId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect((response.body as { message: string }).message).toContain(
        'Only draft events can be deleted',
      );
    });
  });
});
