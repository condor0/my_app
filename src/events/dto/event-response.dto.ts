import { ApiProperty } from '@nestjs/swagger';
import { EventStatus } from '../enums/event-status.enum';

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

  @ApiProperty({ example: 'draft', enum: EventStatus })
  status: EventStatus;

  @ApiProperty({ example: null, required: false })
  rejectReason?: string;

  @ApiProperty({ example: 1 })
  organizationId: number;

  @ApiProperty({ example: 1 })
  ownerId: number;

  @ApiProperty({ example: '2026-01-09T10:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-09T10:00:00Z' })
  updatedAt: Date;
}
