import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

describe('Events CRUD (e2e)', () => {
  let app: INestApplication<App>;
  let userToken: string;
  let user2Token: string;
  let eventId: number;

  const timestamp = Date.now();

  const testUser1 = {
    email: `event-user1-${timestamp}@test.com`,
    password: 'Password123!',
    name: 'Event User 1',
  };

  const testUser2 = {
    email: `event-user2-${timestamp}@test.com`,
    password: 'Password123!',
    name: 'Event User 2',
  };

  const testOrg = {
    name: `Test Events Org ${timestamp}`,
  };

  const testEvent = {
    title: 'Test Event',
    description: 'This is a test event description with enough characters',
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
    const orgQueryResult: Array<{ id: number }> = await dataSource.query(
      `INSERT INTO "organizations" (name) VALUES ('${testOrg.name}') RETURNING id`,
    );
    const orgId = orgQueryResult[0].id;

    // Create first user and get token
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(testUser1)
      .expect(201);

    // Set organization for user1
    await dataSource.query(
      `UPDATE "users" SET "organizationId" = ${orgId} WHERE email = '${testUser1.email}'`,
    );

    const loginResponse1 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testUser1.email,
        password: testUser1.password,
      })
      .expect(200);

    userToken = (loginResponse1.body as { accessToken: string }).accessToken;

    // Create second user and get token
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(testUser2)
      .expect(201);

    // Set organization for user2
    await dataSource.query(
      `UPDATE "users" SET "organizationId" = ${orgId} WHERE email = '${testUser2.email}'`,
    );

    const loginResponse2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testUser2.email,
        password: testUser2.password,
      })
      .expect(200);

    user2Token = (loginResponse2.body as { accessToken: string }).accessToken;

    // Create initial event for GET tests
    const createResponse = await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${userToken}`)
      .send(testEvent)
      .expect(201);

    eventId = (createResponse.body as { id: number }).id;
  });

  afterAll(async () => {
    // Clean up test data
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

  describe('POST /events', () => {
    it('should create a new event as draft', async () => {
      const response = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${userToken}`)
        .send(testEvent)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect((response.body as { title: string }).title).toBe(testEvent.title);
      expect((response.body as { status: string }).status).toBe('draft');
      expect(response.body).toHaveProperty('ownerId');
      expect(response.body).toHaveProperty('organizationId');

      eventId = (response.body as { id: number }).id;
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/events')
        .send(testEvent)
        .expect(401);
    });

    it('should return 400 with invalid data', () => {
      return request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'ab' }) // Too short
        .expect(400);
    });
  });

  describe('GET /events', () => {
    it('should return all events in user organization', async () => {
      const response = await request(app.getHttpServer())
        .get('/events')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect((response.body.data as Array<unknown>).length).toBeGreaterThan(0);
      expect((response.body.data as Array<unknown>)[0]).toHaveProperty(
        'organizationId',
      );
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/events').expect(401);
    });
  });

  describe('GET /events/:id', () => {
    it('should return event details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/events/${eventId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect((response.body as { id: number }).id).toBe(eventId);
      expect((response.body as { title: string }).title).toBe(testEvent.title);
    });

    it('should return 404 for non-existent event', () => {
      return request(app.getHttpServer())
        .get('/events/99999')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get(`/events/${eventId}`).expect(401);
    });
  });

  describe('PATCH /events/:id', () => {
    it('should update own event', async () => {
      const updateData = {
        title: 'Updated Test Event',
        location: 'Updated Location',
      };

      const response = await request(app.getHttpServer())
        .patch(`/events/${eventId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect((response.body as { title: string }).title).toBe(updateData.title);
      expect((response.body as { location: string }).location).toBe(
        updateData.location,
      );
    });

    it('should return 403 when non-owner tries to update', () => {
      return request(app.getHttpServer())
        .patch(`/events/${eventId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ title: 'Hacked Title' })
        .expect(403);
    });

    it('should return 404 for non-existent event', () => {
      return request(app.getHttpServer())
        .patch('/events/99999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Updated' })
        .expect(404);
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .patch(`/events/${eventId}`)
        .send({ title: 'Updated' })
        .expect(401);
    });
  });

  describe('DELETE /events/:id', () => {
    it('should return 403 when non-owner tries to delete', () => {
      return request(app.getHttpServer())
        .delete(`/events/${eventId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
    });

    it('should delete own event', () => {
      return request(app.getHttpServer())
        .delete(`/events/${eventId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(204);
    });

    it('should return 404 after deletion', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).delete('/events/1').expect(401);
    });
  });

  describe('Organization Scoping', () => {
    it('should only return events from user organization', async () => {
      // Create event with user1
      const event1 = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'User 1 Event',
          description: 'Event created by user 1 in the test org',
          date: '2026-12-31T10:00:00Z',
          location: 'Location 1',
        })
        .expect(201);

      // User2 (same org) should see it
      const response2 = await request(app.getHttpServer())
        .get('/events')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      const foundEvent = (response2.body.data as Array<{ id: number }>).find(
        (e: { id: number }) => e.id === (event1.body as { id: number }).id,
      );
      expect(foundEvent).toBeDefined();

      // Clean up
      await request(app.getHttpServer())
        .delete(`/events/${(event1.body as { id: number }).id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(204);
    });
  });

  describe('Ownership Rules', () => {
    it('should enforce ownership on updates', async () => {
      // User1 creates event
      const event = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Ownership Test Event',
          description: 'Testing ownership rules for events in same org',
          date: '2026-12-31T10:00:00Z',
          location: 'Test Location',
        })
        .expect(201);

      // User2 (same org) cannot update
      await request(app.getHttpServer())
        .patch(`/events/${(event.body as { id: number }).id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ title: 'Hacked' })
        .expect(403);

      // User2 (same org) cannot delete
      await request(app.getHttpServer())
        .delete(`/events/${(event.body as { id: number }).id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      // Clean up
      await request(app.getHttpServer())
        .delete(`/events/${(event.body as { id: number }).id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(204);
    });
  });
});
