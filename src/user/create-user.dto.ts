import { IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Alice', description: "User's full name" })
  @IsString()
  name: string;

  @ApiProperty({ example: 30, description: "User's age (years)", minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  age: number;
}
