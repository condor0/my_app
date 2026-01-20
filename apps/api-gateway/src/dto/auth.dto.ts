// AUTH DTOs (Gateway)
// DTOs for HTTP request/response in the gateway.
// These may differ slightly from the microservice DTOs as they
// represent the external API contract.

import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Login request DTO
 */
export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsNotEmpty()
  password: string;
}

/**
 * Signup request DTO
 */
export class SignupDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password (min 6 chars)',
  })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name' })
  @IsNotEmpty()
  name: string;
}

/**
 * User profile DTO
 */
export class UserProfileDto {
  @ApiProperty({ example: 1, description: 'User ID' })
  id: number;

  @ApiProperty({ example: 'user@example.com', description: 'Email' })
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'Name' })
  name: string;

  @ApiProperty({
    example: 'user',
    description: 'Role',
    enum: ['user', 'admin'],
  })
  role: string;

  @ApiProperty({ example: 1, description: 'Organization ID', required: false })
  organizationId?: number;
}

/**
 * Login response DTO
 */
export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'User information' })
  user: UserProfileDto;
}
