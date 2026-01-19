// ============================================================================
// EVENTS SERVICE DTOs
// These DTOs define the contract for event-related communication
// ============================================================================

import {
  IsString,
  IsNotEmpty,
  IsDateString,
  MinLength,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

/**
 * Event status enumeration
 */
export enum EventStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
}

/**
 * Create event request payload
 */
export class CreateEventRequestDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  // User context - passed from gateway after authentication
  userId: number;
  organizationId: number;
}

/**
 * Event response payload
 */
export class EventResponseDto {
  id: number;
  title: string;
  description: string;
  date: Date;
  location: string;
  status: EventStatus;
  rejectReason?: string;
  organizationId: number;
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Find all events request - includes filters and pagination
 */
export class FindAllEventsRequestDto {
  // User context
  userId: number;
  organizationId: number;

  // Filters
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  // Sorting
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'date' | 'title';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';

  // Pagination
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}

/**
 * Paginated events response
 */
export class FindAllEventsResponseDto {
  data: EventResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * Find one event request
 */
export class FindOneEventRequestDto {
  @IsNumber()
  eventId: number;

  userId: number;
  organizationId: number;
}

/**
 * Update event request
 */
export class UpdateEventRequestDto {
  @IsNumber()
  eventId: number;

  userId: number;
  organizationId: number;
  userRole: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

/**
 * Delete event request
 */
export class DeleteEventRequestDto {
  @IsNumber()
  eventId: number;

  userId: number;
  organizationId: number;
  userRole: string;
}

/**
 * Submit event for review request
 */
export class SubmitEventRequestDto {
  @IsNumber()
  eventId: number;

  userId: number;
  organizationId: number;
}

/**
 * Approve event request
 */
export class ApproveEventRequestDto {
  @IsNumber()
  eventId: number;

  userId: number;
  organizationId: number;
  userRole: string;
}

/**
 * Reject event request
 */
export class RejectEventRequestDto {
  @IsNumber()
  eventId: number;

  userId: number;
  organizationId: number;
  userRole: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reason: string;
}
