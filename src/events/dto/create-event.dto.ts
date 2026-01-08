import { IsString, IsNotEmpty, IsDateString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
    description: 'Event date and time (ISO 8601 format)',
  })
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
