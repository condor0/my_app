import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RejectEventDto } from './dto/reject-event.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';
import { User } from '../user/entities/user.entity';
import { GetEventsQueryDto } from './dto/get-events-query.dto';

@ApiTags('Events')
@Controller('events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    @InjectPinoLogger(EventsController.name)
    private readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Create a new event (draft)' })
  @ApiResponse({
    status: 201,
    description: 'Event created successfully',
    type: EventResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or user not in organization',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @Post()
  create(
    @Body() createEventDto: CreateEventDto,
    @Request() req: ExpressRequest & { user: User },
  ): Promise<EventResponseDto> {
    return this.eventsService.create(createEventDto, req.user);
  }

  @ApiOperation({ summary: 'Get all events in user organization' })
  @ApiResponse({
    status: 200,
    description: 'List of events',
    type: [EventResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['draft', 'pending', 'published', 'rejected'],
    description: 'Filter by event status',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Filter events on/after this date (ISO 8601)',
    example: '2026-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'Filter events on/before this date (ISO 8601)',
    example: '2026-12-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in title and description (case-insensitive)',
    example: 'annual meeting',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'date', 'title'],
    description: 'Sort field',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (max 50)',
    example: 20,
  })
  @Get()
  findAll(
    @Query() query: GetEventsQueryDto,
    @Request() req: ExpressRequest & { user: User },
  ): Promise<{
    data: EventResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    return this.eventsService.findAll(req.user, query);
  }

  @ApiOperation({ summary: 'Get event by ID (org-scoped)' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event details',
    type: EventResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Event not found or not in user org' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user: User },
  ): Promise<EventResponseDto> {
    return this.eventsService.findOne(id, req.user);
  }

  @ApiOperation({ summary: 'Update own draft event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event updated successfully',
    type: EventResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Event not found' })
  @ApiForbiddenResponse({
    description: 'Not owner or event is not in draft status',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req: ExpressRequest & { user: User },
  ): Promise<EventResponseDto> {
    return this.eventsService.update(id, updateEventDto, req.user);
  }

  @ApiOperation({ summary: 'Delete own draft event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 204,
    description: 'Event deleted successfully',
  })
  @ApiNotFoundResponse({ description: 'Event not found' })
  @ApiForbiddenResponse({
    description: 'Not owner or event is not in draft status',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @HttpCode(204)
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user: User },
  ): Promise<void> {
    await this.eventsService.remove(id, req.user);
  }

  @ApiOperation({ summary: 'Submit event for moderation (draft -> pending)' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event submitted for review',
    type: EventResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Event not found' })
  @ApiForbiddenResponse({ description: 'Not event owner' })
  @ApiConflictResponse({
    description: 'Event is not in draft status',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @HttpCode(200)
  @Post(':id/submit')
  submit(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user: User },
  ): Promise<EventResponseDto> {
    return this.eventsService.submit(id, req.user);
  }

  @ApiOperation({
    summary: 'Approve event (pending -> published) [Moderator/Admin only]',
  })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event approved and published',
    type: EventResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Event not found' })
  @ApiForbiddenResponse({ description: 'Not moderator or admin' })
  @ApiConflictResponse({
    description: 'Event is not in pending status',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @HttpCode(200)
  @Post(':id/approve')
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user: User },
  ): Promise<EventResponseDto> {
    return this.eventsService.approve(id, req.user);
  }

  @ApiOperation({
    summary: 'Reject event (pending -> rejected) [Moderator/Admin only]',
  })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event rejected',
    type: EventResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Event not found' })
  @ApiForbiddenResponse({ description: 'Not moderator or admin' })
  @ApiConflictResponse({
    description: 'Event is not in pending status',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Reject reason required' })
  @HttpCode(200)
  @Post(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() rejectEventDto: RejectEventDto,
    @Request() req: ExpressRequest & { user: User },
  ): Promise<EventResponseDto> {
    return this.eventsService.reject(id, rejectEventDto, req.user);
  }
}
