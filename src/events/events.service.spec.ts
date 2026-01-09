import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { Event } from './entities/event.entity';
import { EventStatus } from './enums/event-status.enum';
import { Role } from '../auth/enums/role.enum';
import { ConflictException, ForbiddenException } from '@nestjs/common';

describe('EventsService', () => {
  let service: EventsService;
  let repo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };

  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
  };

  const baseUser = {
    id: 10,
    email: 'u@test.dev',
    password: 'x',
    name: 'U',
    organizationId: 1,
    role: Role.USER,
  } as unknown as import('../user/entities/user.entity').User;
  const moderator = {
    id: 99,
    email: 'm@test.dev',
    password: 'x',
    name: 'M',
    organizationId: 1,
    role: Role.MODERATOR,
  } as unknown as import('../user/entities/user.entity').User;
  const admin = {
    id: 100,
    email: 'a@test.dev',
    password: 'x',
    name: 'A',
    organizationId: 1,
    role: Role.ADMIN,
  } as unknown as import('../user/entities/user.entity').User;

  const makeEvent = (overrides: Partial<Event> = {}): Event =>
    ({
      id: 1,
      title: 'Test',
      description: 'Desc',
      date: new Date('2026-01-01T00:00:00Z') as any,
      location: 'HQ',
      organizationId: 1,
      ownerId: baseUser.id,
      status: EventStatus.DRAFT,
      createdAt: new Date() as any,
      updatedAt: new Date() as any,
      rejectReason: undefined,
      ...overrides,
    }) as Event;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useValue: repo,
        },
        {
          provide: 'PinoLogger:EventsService',
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('submit', () => {
    it('submits draft event to pending (owner only)', async () => {
      const event = makeEvent({ status: EventStatus.DRAFT });
      repo.findOne.mockResolvedValue(event);
      repo.save.mockImplementation((e: Event) => Promise.resolve(e));

      const saved = await service.submit(event.id, baseUser);
      expect(saved.status).toBe(EventStatus.PENDING);
      expect(repo.save).toHaveBeenCalled();
    });

    it('throws conflict when status not draft', async () => {
      const event = makeEvent({ status: EventStatus.PUBLISHED });
      repo.findOne.mockResolvedValue(event);

      await expect(service.submit(event.id, baseUser)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws forbidden when not the owner', async () => {
      const event = makeEvent({ status: EventStatus.DRAFT, ownerId: 777 });
      repo.findOne.mockResolvedValue(event);

      await expect(service.submit(event.id, baseUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('approve', () => {
    it('approves pending event (moderator/admin)', async () => {
      const event = makeEvent({ status: EventStatus.PENDING });
      repo.findOne.mockResolvedValue(event);
      repo.save.mockImplementation((e: Event) => Promise.resolve(e));

      const saved = await service.approve(event.id, moderator);
      expect(saved.status).toBe(EventStatus.PUBLISHED);
      expect(saved.rejectReason).toBeUndefined();
    });

    it('forbids non-moderator/non-admin', async () => {
      const event = makeEvent({ status: EventStatus.PENDING });
      repo.findOne.mockResolvedValue(event);

      await expect(service.approve(event.id, baseUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('conflict when status not pending', async () => {
      const event = makeEvent({ status: EventStatus.DRAFT });
      repo.findOne.mockResolvedValue(event);

      await expect(service.approve(event.id, moderator)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('reject', () => {
    it('rejects pending event with reason (admin)', async () => {
      const event = makeEvent({ status: EventStatus.PENDING });
      repo.findOne.mockResolvedValue(event);
      repo.save.mockImplementation((e: Event) => Promise.resolve(e));

      const saved = await service.reject(
        event.id,
        { rejectReason: 'Insufficient details' },
        admin,
      );
      expect(saved.status).toBe(EventStatus.REJECTED);
      expect(saved.rejectReason).toBe('Insufficient details');
    });

    it('forbids non-moderator/non-admin', async () => {
      const event = makeEvent({ status: EventStatus.PENDING });
      repo.findOne.mockResolvedValue(event);

      await expect(
        service.reject(event.id, { rejectReason: 'x' }, baseUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('conflict when status not pending', async () => {
      const event = makeEvent({ status: EventStatus.DRAFT });
      repo.findOne.mockResolvedValue(event);

      await expect(
        service.reject(event.id, { rejectReason: 'x' }, admin),
      ).rejects.toThrow(ConflictException);
    });
  });
});
