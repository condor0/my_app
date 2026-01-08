import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RejectEventDto } from './dto/reject-event.dto';
import { EventStatus } from './enums/event-status.enum';
import { User } from '../user/entities/user.entity';
import { Role } from '../auth/enums/role.enum';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    @InjectPinoLogger(EventsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(createEventDto: CreateEventDto, user: User): Promise<Event> {
    if (!user.organizationId) {
      throw new BadRequestException('User must belong to an organization');
    }

    this.logger.info(
      { userId: user.id, organizationId: user.organizationId },
      'Creating new event',
    );

    const event = this.eventsRepository.create({
      ...createEventDto,
      date: new Date(createEventDto.date),
      organizationId: user.organizationId,
      ownerId: user.id,
      status: EventStatus.DRAFT,
    });

    const savedEvent = await this.eventsRepository.save(event);
    this.logger.info({ eventId: savedEvent.id }, 'Event created successfully');
    return savedEvent;
  }

  async findAll(user: User): Promise<Event[]> {
    if (!user.organizationId) {
      return [];
    }

    // Only return events from user's organization
    return this.eventsRepository.find({
      where: { organizationId: user.organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, user: User): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    // Enforce org scoping
    if (event.organizationId !== user.organizationId) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async update(
    id: number,
    updateEventDto: UpdateEventDto,
    user: User,
  ): Promise<Event> {
    const event = await this.findOne(id, user);

    // Only owner can update their own events
    if (event.ownerId !== user.id) {
      throw new ForbiddenException('You can only update your own events');
    }

    // Only draft events can be updated
    if (event.status !== EventStatus.DRAFT) {
      throw new ForbiddenException('Only draft events can be updated');
    }

    // Update fields
    if (updateEventDto.title) event.title = updateEventDto.title;
    if (updateEventDto.description)
      event.description = updateEventDto.description;
    if (updateEventDto.date) event.date = new Date(updateEventDto.date);
    if (updateEventDto.location) event.location = updateEventDto.location;

    return this.eventsRepository.save(event);
  }

  async remove(id: number, user: User): Promise<void> {
    const event = await this.findOne(id, user);

    // Only owner can delete their own events
    if (event.ownerId !== user.id) {
      throw new ForbiddenException('You can only delete your own events');
    }

    // Only draft events can be deleted
    if (event.status !== EventStatus.DRAFT) {
      throw new ForbiddenException('Only draft events can be deleted');
    }

    await this.eventsRepository.remove(event);
  }

  // State transition: draft -> pending (submit for review)
  async submit(id: number, user: User): Promise<Event> {
    const event = await this.findOne(id, user);

    this.logger.info(
      { eventId: id, userId: user.id, currentStatus: event.status },
      'Attempting to submit event for review',
    );

    // Only owner can submit their own events
    if (event.ownerId !== user.id) {
      throw new ForbiddenException('You can only submit your own events');
    }

    // Only draft events can be submitted
    if (event.status !== EventStatus.DRAFT) {
      this.logger.warn(
        { eventId: id, currentStatus: event.status },
        'Invalid status transition attempted',
      );
      throw new ConflictException(
        `Cannot submit event with status "${event.status}". Only draft events can be submitted.`,
      );
    }

    event.status = EventStatus.PENDING;
    const savedEvent = await this.eventsRepository.save(event);
    this.logger.info(
      { eventId: id, newStatus: EventStatus.PENDING },
      'Event submitted for review',
    );
    return savedEvent;
  }

  // State transition: pending -> published (approve)
  async approve(id: number, user: User): Promise<Event> {
    this.logger.info(
      { eventId: id, userId: user.id, userRole: user.role },
      'Attempting to approve event',
    );

    // Only moderators and admins can approve
    if (user.role !== Role.MODERATOR && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only moderators or admins can approve events',
      );
    }

    const event = await this.findOne(id, user);

    // Only pending events can be approved
    if (event.status !== EventStatus.PENDING) {
      this.logger.warn(
        { eventId: id, currentStatus: event.status },
        'Invalid approval attempted',
      );
      throw new ConflictException(
        `Cannot approve event with status "${event.status}". Only pending events can be approved.`,
      );
    }

    event.status = EventStatus.PUBLISHED;
    event.rejectReason = undefined; // Clear any previous reject reason
    const savedEvent = await this.eventsRepository.save(event);
    this.logger.info(
      { eventId: id, moderatorId: user.id, newStatus: EventStatus.PUBLISHED },
      'Event approved and published',
    );
    return savedEvent;
  }

  // State transition: pending -> rejected (reject)
  async reject(
    id: number,
    rejectEventDto: RejectEventDto,
    user: User,
  ): Promise<Event> {
    this.logger.info(
      { eventId: id, userId: user.id, userRole: user.role },
      'Attempting to reject event',
    );

    // Only moderators and admins can reject
    if (user.role !== Role.MODERATOR && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only moderators or admins can reject events',
      );
    }

    const event = await this.findOne(id, user);

    // Only pending events can be rejected
    if (event.status !== EventStatus.PENDING) {
      this.logger.warn(
        { eventId: id, currentStatus: event.status },
        'Invalid rejection attempted',
      );
      throw new ConflictException(
        `Cannot reject event with status "${event.status}". Only pending events can be rejected.`,
      );
    }

    event.status = EventStatus.REJECTED;
    event.rejectReason = rejectEventDto.rejectReason;
    const savedEvent = await this.eventsRepository.save(event);
    this.logger.info(
      {
        eventId: id,
        moderatorId: user.id,
        newStatus: EventStatus.REJECTED,
        reason: rejectEventDto.rejectReason,
      },
      'Event rejected',
    );
    return savedEvent;
  }
}
