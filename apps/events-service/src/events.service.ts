// EVENTS MICROSERVICE SERVICE
// Business logic for event operations.
// This is a simplified version of the monolith's EventsService,
// adapted to work with the microservice DTOs.

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Event } from './entities/event.entity';
import { EventStatus } from './entities/event-status.enum';
import {
  CreateEventRequestDto,
  FindAllEventsRequestDto,
  FindOneEventRequestDto,
  UpdateEventRequestDto,
  DeleteEventRequestDto,
  SubmitEventRequestDto,
  ApproveEventRequestDto,
  RejectEventRequestDto,
  EventResponseDto,
  FindAllEventsResponseDto,
} from '@libscontracts';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    @InjectPinoLogger(EventsService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Create a new event in DRAFT status
   */
  async create(data: CreateEventRequestDto): Promise<EventResponseDto> {
    if (!data.organizationId) {
      throw new Error('User must belong to an organization');
    }

    const event = this.eventsRepository.create({
      title: data.title,
      description: data.description,
      date: new Date(data.date as string | number | Date),
      location: data.location,
      organizationId: data.organizationId,
      ownerId: data.userId,
      status: EventStatus.DRAFT,
    });

    const savedEvent = await this.eventsRepository.save(event);
    this.logger.info({ eventId: savedEvent.id }, 'Event created');

    return this.toResponseDto(savedEvent);
  }

  /**
   * Find all events for the user's organization with filtering and pagination
   */
  async findAll(
    data: FindAllEventsRequestDto,
  ): Promise<FindAllEventsResponseDto> {
    const {
      organizationId,
      status,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 20,
    } = data;

    if (!organizationId) {
      return { data: [], meta: { total: 0, page, limit } };
    }

    const qb = this.eventsRepository.createQueryBuilder('event');
    qb.where('event.organizationId = :orgId', { orgId: organizationId });

    // Apply filters
    if (status) {
      qb.andWhere('event.status = :status', { status });
    }

    if (dateFrom) {
      qb.andWhere('event.date >= :dateFrom', {
        dateFrom: new Date(dateFrom as string | number | Date),
      });
    }

    if (dateTo) {
      qb.andWhere('event.date <= :dateTo', {
        dateTo: new Date(dateTo as string | number | Date),
      });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(event.title) LIKE LOWER(:search) OR LOWER(event.description) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    // Apply sorting
    const allowedSortFields = ['createdAt', 'date', 'title'];
    const sortField = allowedSortFields.includes(sortBy as string)
      ? (sortBy as string)
      : 'createdAt';
    qb.orderBy(`event.${sortField}`, sortOrder === 'ASC' ? 'ASC' : 'DESC');

    // Get total count
    const total = await qb.getCount();

    // Apply pagination
    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const events = await qb.getMany();

    return {
      data: events.map((e) => this.toResponseDto(e)),
      meta: { total, page, limit },
    };
  }

  /**
   * Find a single event by ID
   */
  async findOne(data: FindOneEventRequestDto): Promise<EventResponseDto> {
    const event = await this.eventsRepository.findOne({
      where: {
        id: data.eventId,
        organizationId: data.organizationId,
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    return this.toResponseDto(event);
  }

  /**
   * Update an existing event
   */
  async update(data: UpdateEventRequestDto): Promise<EventResponseDto> {
    const event = await this.eventsRepository.findOne({
      where: {
        id: data.eventId,
        organizationId: data.organizationId,
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // Check permissions: only owner or admin can update
    const isAdmin = data.userRole === 'admin';
    const isOwner = event.ownerId === data.userId;

    if (!isAdmin && !isOwner) {
      throw new Error('You can only update your own events');
    }

    // Only DRAFT events can be updated
    if (event.status !== EventStatus.DRAFT) {
      throw new Error('Only draft events can be updated');
    }

    // Apply updates
    if (data.title) event.title = data.title;
    if (data.description) event.description = data.description;
    if (data.date) event.date = new Date(data.date as string | number | Date);
    if (data.location) event.location = data.location;

    const savedEvent = await this.eventsRepository.save(event);
    return this.toResponseDto(savedEvent);
  }

  /**
   * Delete an event
   */
  async delete(data: DeleteEventRequestDto): Promise<void> {
    const event = await this.eventsRepository.findOne({
      where: {
        id: data.eventId,
        organizationId: data.organizationId,
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // Check permissions
    const isAdmin = data.userRole === 'admin';
    const isOwner = event.ownerId === data.userId;

    if (!isAdmin && !isOwner) {
      throw new Error('You can only delete your own events');
    }

    await this.eventsRepository.remove(event);
    this.logger.info({ eventId: data.eventId }, 'Event deleted');
  }

  /**
   * Submit event for review (DRAFT -> PENDING)
   */
  async submit(data: SubmitEventRequestDto): Promise<EventResponseDto> {
    const event = await this.eventsRepository.findOne({
      where: {
        id: data.eventId,
        organizationId: data.organizationId,
        ownerId: data.userId,
      },
    });

    if (!event) {
      throw new Error('Event not found or you are not the owner');
    }

    if (event.status !== EventStatus.DRAFT) {
      throw new Error('Only draft events can be submitted');
    }

    event.status = EventStatus.PENDING;
    const savedEvent = await this.eventsRepository.save(event);

    this.logger.info({ eventId: event.id }, 'Event submitted for review');
    return this.toResponseDto(savedEvent);
  }

  /**
   * Approve event (PENDING -> PUBLISHED) - Admin only
   */
  async approve(data: ApproveEventRequestDto): Promise<EventResponseDto> {
    if (data.userRole !== 'admin') {
      throw new Error('Only admins can approve events');
    }

    const event = await this.eventsRepository.findOne({
      where: {
        id: data.eventId,
        organizationId: data.organizationId,
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.status !== EventStatus.PENDING) {
      throw new Error('Only pending events can be approved');
    }

    event.status = EventStatus.PUBLISHED;
    const savedEvent = await this.eventsRepository.save(event);

    this.logger.info({ eventId: event.id }, 'Event approved');
    return this.toResponseDto(savedEvent);
  }

  /**
   * Reject event (PENDING -> REJECTED) - Admin only
   */
  async reject(data: RejectEventRequestDto): Promise<EventResponseDto> {
    if (data.userRole !== 'admin') {
      throw new Error('Only admins can reject events');
    }

    const event = await this.eventsRepository.findOne({
      where: {
        id: data.eventId,
        organizationId: data.organizationId,
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.status !== EventStatus.PENDING) {
      throw new Error('Only pending events can be rejected');
    }

    event.status = EventStatus.REJECTED;
    event.rejectReason = data.reason;
    const savedEvent = await this.eventsRepository.save(event);

    this.logger.info(
      { eventId: event.id, reason: data.reason },
      'Event rejected',
    );
    return this.toResponseDto(savedEvent);
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(event: Event): EventResponseDto {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      status: event.status as any,
      rejectReason: event.rejectReason,
      organizationId: event.organizationId,
      ownerId: event.ownerId,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}
