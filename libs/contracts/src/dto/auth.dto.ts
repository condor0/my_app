// ============================================================================
// AUTH SERVICE DTOs
// These DTOs define the contract for auth-related communication
// ============================================================================

import { IsEmail, IsNotEmpty, MinLength, IsNumber } from 'class-validator';

/**
 * Login request payload
 */
export class LoginRequestDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}

/**
 * Login response payload
 */
export class LoginResponseDto {
  accessToken: string;
  user: UserDto;
}

/**
 * Signup request payload
 */
export class SignupRequestDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  name: string;
}

/**
 * User data transfer object
 * Represents user data passed between services
 */
export class UserDto {
  id: number;
  email: string;
  name: string;
  role: string;
  organizationId?: number;
}

/**
 * Token validation request
 */
export class ValidateTokenRequestDto {
  @IsNotEmpty()
  token: string;
}

/**
 * Token validation response
 */
export class ValidateTokenResponseDto {
  valid: boolean;
  user?: UserDto;
}

/**
 * Get user profile request - includes user ID from token
 */
export class GetUserProfileRequestDto {
  @IsNumber()
  userId: number;
}
