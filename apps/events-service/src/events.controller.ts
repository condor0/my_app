// EVENTS MICROSERVICE CONTROLLER
// This controller handles incoming TCP messages from the API Gateway.
// It uses @MessagePattern decorators to define which messages it responds to.
//
// KEY CONCEPTS:
// - @MessagePattern: Defines the pattern/route this handler responds to
// - @Payload: Extracts the message payload (like @Body in HTTP)
// - TCP Transport: Request-response pattern over TCP sockets

import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { EventsService } from './events.service';
import {
  EVENTS_PATTERNS,
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
  ServiceResponse,
} from '@libscontracts';

@Controller()
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    @InjectPinoLogger(EventsController.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * CREATE EVENT
   * Pattern: 'events.create'
   *
   * The gateway sends a message with the event data plus user context.
   * We create the event and return the result.
   */
  @MessagePattern(EVENTS_PATTERNS.CREATE)
  async create(
    @Payload() data: CreateEventRequestDto,
  ): Promise<ServiceResponse<EventResponseDto>> {
    this.logger.info(
      { pattern: EVENTS_PATTERNS.CREATE, userId: data.userId },
      'Creating event',
    );

    try {
      const event = await this.eventsService.create(data);
      return ServiceResponse.ok(event);
    } catch (err) {
      const error = err as Error;
      this.logger.error({ error: error.message }, 'Failed to create event');
      return ServiceResponse.fail({
        code: 'EVENT_CREATE_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * FIND ALL EVENTS
   * Pattern: 'events.find_all'
   *
   * Returns paginated list of events for the user's organization.
   */
  @MessagePattern(EVENTS_PATTERNS.FIND_ALL)
  async findAll(
    @Payload() data: FindAllEventsRequestDto,
  ): Promise<ServiceResponse<FindAllEventsResponseDto>> {
    this.logger.info(
      {
        pattern: EVENTS_PATTERNS.FIND_ALL,
        userId: data.userId,
        orgId: data.organizationId,
      },
      'Finding all events',
    );

    try {
      const result = await this.eventsService.findAll(data);
      return ServiceResponse.ok(result);
    } catch (err) {
      const error = err as Error;
      this.logger.error({ error: error.message }, 'Failed to find events');
      return ServiceResponse.fail({
        code: 'EVENT_FIND_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * FIND ONE EVENT
   * Pattern: 'events.find_one'
   */
  @MessagePattern(EVENTS_PATTERNS.FIND_ONE)
  async findOne(
    @Payload() data: FindOneEventRequestDto,
  ): Promise<ServiceResponse<EventResponseDto>> {
    this.logger.info(
      { pattern: EVENTS_PATTERNS.FIND_ONE, eventId: data.eventId },
      'Finding event',
    );

    try {
      const event = await this.eventsService.findOne(data);
      return ServiceResponse.ok(event);
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        { error: error.message, eventId: data.eventId },
        'Failed to find event',
      );
      return ServiceResponse.fail({
        code: 'EVENT_NOT_FOUND',
        message: error.message,
      });
    }
  }

  /**
   * UPDATE EVENT
   * Pattern: 'events.update'
   */
  @MessagePattern(EVENTS_PATTERNS.UPDATE)
  async update(
    @Payload() data: UpdateEventRequestDto,
  ): Promise<ServiceResponse<EventResponseDto>> {
    this.logger.info(
      { pattern: EVENTS_PATTERNS.UPDATE, eventId: data.eventId },
      'Updating event',
    );

    try {
      const event = await this.eventsService.update(data);
      return ServiceResponse.ok(event);
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        { error: error.message, eventId: data.eventId },
        'Failed to update event',
      );
      return ServiceResponse.fail({
        code: 'EVENT_UPDATE_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * DELETE EVENT
   * Pattern: 'events.delete'
   */
  @MessagePattern(EVENTS_PATTERNS.DELETE)
  async delete(
    @Payload() data: DeleteEventRequestDto,
  ): Promise<ServiceResponse<void>> {
    this.logger.info(
      { pattern: EVENTS_PATTERNS.DELETE, eventId: data.eventId },
      'Deleting event',
    );

    try {
      await this.eventsService.delete(data);
      return ServiceResponse.ok(undefined);
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        { error: error.message, eventId: data.eventId },
        'Failed to delete event',
      );
      return ServiceResponse.fail({
        code: 'EVENT_DELETE_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * SUBMIT EVENT FOR REVIEW
   * Pattern: 'events.submit'
   */
  @MessagePattern(EVENTS_PATTERNS.SUBMIT)
  async submit(
    @Payload() data: SubmitEventRequestDto,
  ): Promise<ServiceResponse<EventResponseDto>> {
    this.logger.info(
      { pattern: EVENTS_PATTERNS.SUBMIT, eventId: data.eventId },
      'Submitting event for review',
    );

    try {
      const event = await this.eventsService.submit(data);
      return ServiceResponse.ok(event);
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        { error: error.message, eventId: data.eventId },
        'Failed to submit event',
      );
      return ServiceResponse.fail({
        code: 'EVENT_SUBMIT_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * APPROVE EVENT
   * Pattern: 'events.approve'
   */
  @MessagePattern(EVENTS_PATTERNS.APPROVE)
  async approve(
    @Payload() data: ApproveEventRequestDto,
  ): Promise<ServiceResponse<EventResponseDto>> {
    this.logger.info(
      { pattern: EVENTS_PATTERNS.APPROVE, eventId: data.eventId },
      'Approving event',
    );

    try {
      const event = await this.eventsService.approve(data);
      return ServiceResponse.ok(event);
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        { error: error.message, eventId: data.eventId },
        'Failed to approve event',
      );
      return ServiceResponse.fail({
        code: 'EVENT_APPROVE_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * REJECT EVENT
   * Pattern: 'events.reject'
   */
  @MessagePattern(EVENTS_PATTERNS.REJECT)
  async reject(
    @Payload() data: RejectEventRequestDto,
  ): Promise<ServiceResponse<EventResponseDto>> {
    this.logger.info(
      { pattern: EVENTS_PATTERNS.REJECT, eventId: data.eventId },
      'Rejecting event',
    );

    try {
      const event = await this.eventsService.reject(data);
      return ServiceResponse.ok(event);
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        { error: error.message, eventId: data.eventId },
        'Failed to reject event',
      );
      return ServiceResponse.fail({
        code: 'EVENT_REJECT_FAILED',
        message: error.message,
      });
    }
  }
}
