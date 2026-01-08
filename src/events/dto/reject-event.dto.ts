import { IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectEventDto {
  @ApiProperty({
    description: 'Reason for rejecting the event',
    example: 'Event content violates community guidelines',
    minLength: 10,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  rejectReason: string;
}
