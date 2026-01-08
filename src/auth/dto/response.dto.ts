import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../enums/role.enum';

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token for authentication',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJzdWIiOjEsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzA2NDc0MDAwLCJleHAiOjE3MDY0Nzc2MDB9.abc123def456',
  })
  accessToken: string;
}

export class UserProfileResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User display name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'User role in the system',
    enum: Role,
    example: Role.USER,
  })
  role: Role;
}

export class MessageResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'Admin admin@example.com can delete users',
  })
  message: string;
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 401,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Unauthorized',
  })
  message: string;

  @ApiProperty({
    description: 'Error type',
    example: 'Unauthorized',
    required: false,
  })
  error?: string;
}

export class ForbiddenResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 403,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Detailed error message',
    example: 'You do not have permission to access this resource',
  })
  message: string;

  @ApiProperty({
    description: 'Error type',
    example: 'Forbidden',
  })
  error: string;
}
