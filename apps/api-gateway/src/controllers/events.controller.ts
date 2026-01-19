// EVENTS CONTROLLER (Gateway)
// This controller handles HTTP requests for events and proxies them
// to the Events microservice via TCP.
//
// All endpoints require authentication (AuthGuard).
// The gateway attaches user context to each request before forwarding.

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Inject,
  ParseIntPipe,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { firstValueFrom, Observable } from 'rxjs';
import {
  SERVICE_TOKENS,
  EVENTS_PATTERNS,
  ServiceResponse,
} from '@libscontracts';
import { AuthGuard } from '../guards/auth.guard';
import {
  CreateEventDto,
  UpdateEventDto,
  RejectEventDto,
  EventResponseDto,
  EventsListResponseDto,
  GetEventsQueryDto,
} from '../dto/events.dto';

@ApiTags('Events')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('events')
export class EventsController {
  constructor(
    @Inject(SERVICE_TOKENS.EVENTS_SERVICE as string)
    private readonly eventsClient: ClientProxy,
    @InjectPinoLogger(EventsController.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Create Event
   * POST /events
   */
  @ApiOperation({ summary: 'Create a new event (draft)' })
  @ApiResponse({
    status: 201,
    description: 'Event created',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post()
  async create(
    @Body() createEventDto: CreateEventDto,
    @Request() req: any,
  ): Promise<EventResponseDto> {
    this.logger.info({ userId: req.user.id }, 'Create event request');

    // Build request with user context
    const payload = {
      ...createEventDto,
      userId: req.user.id,
      organizationId: req.user.organizationId,
    };

    const observable: Observable<ServiceResponse<EventResponseDto>> =
      this.eventsClient.send(
        EVENTS_PATTERNS.CREATE,
        payload as Record<string, unknown>,
      );
    const response = await firstValueFrom(observable);

    if (!response.success || !response.data) {
      throw new BadRequestException(
        response.error?.message || 'Failed to create event',
      );
    }

    return response.data;
  }

  /**
   * Get All Events
   * GET /events
   */
  @ApiOperation({ summary: 'Get all events in organization' })
  @ApiResponse({
    status: 200,
    description: 'List of events',
    type: EventsListResponseDto,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['draft', 'pending', 'published', 'rejected'],
  })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'date', 'title'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get()
  async findAll(
    @Query() query: GetEventsQueryDto,
    @Request() req: any,
  ): Promise<EventsListResponseDto> {
    this.logger.info({ userId: req.user.id, query }, 'Find all events request');

    const payload = {
      ...query,
      userId: req.user.id,
      organizationId: req.user.organizationId,
    };

    const observable: Observable<ServiceResponse<EventsListResponseDto>> =
      this.eventsClient.send(
        EVENTS_PATTERNS.FIND_ALL,
        payload as Record<string, unknown>,
      );
    const response = await firstValueFrom(observable);

    if (!response.success || !response.data) {
      throw new BadRequestException(
        response.error?.message || 'Failed to fetch events',
      );
    }

    return response.data;
  }

  /**
   * Get Single Event
   * GET /events/:id
   */
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event details',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<EventResponseDto> {
    this.logger.info(
      { userId: req.user.id, eventId: id },
      'Find one event request',
    );

    const payload = {
      eventId: id,
      userId: req.user.id,
      organizationId: req.user.organizationId,
    };

    const observable: Observable<ServiceResponse<EventResponseDto>> =
      this.eventsClient.send(
        EVENTS_PATTERNS.FIND_ONE,
        payload as Record<string, unknown>,
      );
    const response = await firstValueFrom(observable);

    if (!response.success || !response.data) {
      throw new NotFoundException(response.error?.message || 'Event not found');
    }

    return response.data;
  }

  /**
   * Update Event
   * PATCH /events/:id
   */
  @ApiOperation({ summary: 'Update event (draft only)' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event updated',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 403, description: 'Not allowed to update' })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req: any,
  ): Promise<EventResponseDto> {
    this.logger.info(
      { userId: req.user.id, eventId: id },
      'Update event request',
    );

    const payload = {
      eventId: id,
      ...updateEventDto,
      userId: req.user.id,
      organizationId: req.user.organizationId,
      userRole: req.user.role,
    };

    const observable: Observable<ServiceResponse<EventResponseDto>> =
      this.eventsClient.send(
        EVENTS_PATTERNS.UPDATE,
        payload as Record<string, unknown>,
      );
    const response = await firstValueFrom(observable);

    if (!response.success || !response.data) {
      const errorMsg = response.error?.message || 'Failed to update event';
      if (errorMsg.includes('not found')) {
        throw new NotFoundException(errorMsg);
      }
      if (errorMsg.includes('only')) {
        throw new ForbiddenException(errorMsg);
      }
      throw new BadRequestException(errorMsg);
    }

    return response.data;
  }

  /**
   * Delete Event
   * DELETE /events/:id
   */
  @ApiOperation({ summary: 'Delete event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event deleted' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 403, description: 'Not allowed to delete' })
  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<{ message: string }> {
    this.logger.info(
      { userId: req.user.id, eventId: id },
      'Delete event request',
    );

    const payload = {
      eventId: id,
      userId: req.user.id,
      organizationId: req.user.organizationId,
      userRole: req.user.role,
    };

    const observable: Observable<ServiceResponse<void>> =
      this.eventsClient.send(
        EVENTS_PATTERNS.DELETE,
        payload as Record<string, unknown>,
      );
    const response = await firstValueFrom(observable);

    if (!response.success) {
      const errorMsg = response.error?.message || 'Failed to delete event';
      if (errorMsg.includes('not found')) {
        throw new NotFoundException(errorMsg);
      }
      throw new ForbiddenException(errorMsg);
    }

    return { message: 'Event deleted successfully' };
  }

  /**
   * Submit Event for Review
   * POST /events/:id/submit
   */
  @ApiOperation({ summary: 'Submit event for review' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event submitted',
    type: EventResponseDto,
  })
  @Post(':id/submit')
  async submit(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<EventResponseDto> {
    this.logger.info(
      { userId: req.user.id, eventId: id },
      'Submit event request',
    );

    const payload = {
      eventId: id,
      userId: req.user.id,
      organizationId: req.user.organizationId,
    };

    const observable: Observable<ServiceResponse<EventResponseDto>> =
      this.eventsClient.send(
        EVENTS_PATTERNS.SUBMIT,
        payload as Record<string, unknown>,
      );
    const response = await firstValueFrom(observable);

    if (!response.success || !response.data) {
      throw new BadRequestException(
        response.error?.message || 'Failed to submit event',
      );
    }

    return response.data;
  }

  /**
   * Approve Event (Admin only)
   * POST /events/:id/approve
   */
  @ApiOperation({ summary: 'Approve event (admin only)' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event approved',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Admin only' })
  @Post(':id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<EventResponseDto> {
    this.logger.info(
      { userId: req.user.id, eventId: id },
      'Approve event request',
    );

    const payload = {
      eventId: id,
      userId: req.user.id,
      organizationId: req.user.organizationId,
      userRole: req.user.role,
    };

    const observable: Observable<ServiceResponse<EventResponseDto>> =
      this.eventsClient.send(
        EVENTS_PATTERNS.APPROVE,
        payload as Record<string, unknown>,
      );
    const response = await firstValueFrom(observable);

    if (!response.success || !response.data) {
      const errorMsg = response.error?.message || 'Failed to approve event';
      if (errorMsg.includes('admin')) {
        throw new ForbiddenException(errorMsg);
      }
      throw new BadRequestException(errorMsg);
    }

    return response.data;
  }

  /**
   * Reject Event (Admin only)
   * POST /events/:id/reject
   */
  @ApiOperation({ summary: 'Reject event (admin only)' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event rejected',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Admin only' })
  @Post(':id/reject')
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() rejectDto: RejectEventDto,
    @Request() req: any,
  ): Promise<EventResponseDto> {
    this.logger.info(
      { userId: req.user.id, eventId: id },
      'Reject event request',
    );

    const payload = {
      eventId: id,
      reason: rejectDto.reason,
      userId: req.user.id,
      organizationId: req.user.organizationId,
      userRole: req.user.role,
    };

    const observable: Observable<ServiceResponse<EventResponseDto>> =
      this.eventsClient.send(
        EVENTS_PATTERNS.REJECT,
        payload as Record<string, unknown>,
      );
    const response = await firstValueFrom(observable);

    if (!response.success || !response.data) {
      const errorMsg = response.error?.message || 'Failed to reject event';
      if (errorMsg.includes('admin')) {
        throw new ForbiddenException(errorMsg);
      }
      throw new BadRequestException(errorMsg);
    }

    return response.data;
  }
}
