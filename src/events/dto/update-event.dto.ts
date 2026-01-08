import { IsString, IsOptional, IsDateString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEventDto {
  @ApiProperty({
    example: 'Updated Event Title',
    description: 'Event title',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(3)
  title?: string;

  @ApiProperty({
    example: 'Updated event description',
    description: 'Event description',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(10)
  description?: string;

  @ApiProperty({
    example: '2026-12-31T15:00:00Z',
    description: 'Event date and time (ISO 8601 format)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({
    example: 'Board Room',
    description: 'Event location',
    required: false,
  })
  @IsString()
  @IsOptional()
  location?: string;
}
