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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request as ExpressRequest } from 'express';
import { User } from '../user/entities/user.entity';

@ApiTags('Events')
@Controller('events')
@UseGuards(AuthGuard())
@ApiBearerAuth('JWT-auth')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

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
  @Get()
  findAll(
    @Request() req: ExpressRequest & { user: User },
  ): Promise<EventResponseDto[]> {
    return this.eventsService.findAll(req.user);
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
}
