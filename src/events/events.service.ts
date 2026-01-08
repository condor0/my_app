import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventStatus } from './enums/event-status.enum';
import { User } from '../user/entities/user.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto, user: User): Promise<Event> {
    if (!user.organizationId) {
      throw new BadRequestException('User must belong to an organization');
    }

    const event = this.eventsRepository.create({
      ...createEventDto,
      date: new Date(createEventDto.date),
      organizationId: user.organizationId,
      ownerId: user.id,
      status: EventStatus.DRAFT,
    });

    return this.eventsRepository.save(event);
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
}
