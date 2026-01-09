import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EventStatus } from '../enums/event-status.enum';

const SORT_FIELDS = ['createdAt', 'date', 'title'] as const;
type SortField = (typeof SORT_FIELDS)[number];

type SortOrder = 'ASC' | 'DESC';

export class GetEventsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({
    description:
      'ISO date string to filter events occurring on/after this date',
    example: '2026-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description:
      'ISO date string to filter events occurring on/before this date',
    example: '2026-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Case-insensitive search over title and description',
    maxLength: 100,
    example: 'annual meeting',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: SORT_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(SORT_FIELDS)
  sortBy?: SortField = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: SortOrder = 'DESC';

  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Page size',
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export type SortFieldType = SortField;
export type SortOrderType = SortOrder;
