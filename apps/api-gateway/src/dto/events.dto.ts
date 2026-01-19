// ============================================================================
// EVENTS DTOs (Gateway)
// ============================================================================
// DTOs for HTTP request/response in the gateway.
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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Event status enum
 */
export enum EventStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
}

/**
 * Create event request DTO
 */
export class CreateEventDto {
  @ApiProperty({
    example: 'Company Annual Meeting',
    description: 'Event title',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  title: string;

  @ApiProperty({
    example: 'Annual company-wide meeting to discuss Q4 results',
    description: 'Event description',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @ApiProperty({
    example: '2026-12-31T10:00:00Z',
    description: 'Event date (ISO 8601)',
  })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({
    example: 'Main Conference Room',
    description: 'Event location',
  })
  @IsString()
  @IsNotEmpty()
  location: string;
}

/**
 * Update event request DTO
 */
export class UpdateEventDto {
  @ApiPropertyOptional({ example: 'Updated Event Title' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description for the event' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @ApiPropertyOptional({ example: '2026-12-31T14:00:00Z' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'New Location' })
  @IsOptional()
  @IsString()
  location?: string;
}

/**
 * Reject event request DTO
 */
export class RejectEventDto {
  @ApiProperty({
    example: 'Event does not meet quality standards',
    description: 'Rejection reason',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reason: string;
}

/**
 * Query parameters for listing events
 */
export class GetEventsQueryDto {
  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ example: 'annual meeting' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['createdAt', 'date', 'title'] })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'date' | 'title';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}

/**
 * Event response DTO
 */
export class EventResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Company Annual Meeting' })
  title: string;

  @ApiProperty({ example: 'Annual company-wide meeting' })
  description: string;

  @ApiProperty({ example: '2026-12-31T10:00:00Z' })
  date: Date;

  @ApiProperty({ example: 'Main Conference Room' })
  location: string;

  @ApiProperty({ enum: EventStatus, example: 'draft' })
  status: EventStatus;

  @ApiPropertyOptional({ example: 'Does not meet standards' })
  rejectReason?: string;

  @ApiProperty({ example: 1 })
  organizationId: number;

  @ApiProperty({ example: 1 })
  ownerId: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

/**
 * Paginated events list response
 */
export class EventsListResponseDto {
  @ApiProperty({ type: [EventResponseDto] })
  data: EventResponseDto[];

  @ApiProperty({
    example: { total: 100, page: 1, limit: 20 },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}
