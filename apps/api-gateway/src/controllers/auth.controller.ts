// AUTH CONTROLLER (Gateway)
// This controller handles HTTP requests for authentication and proxies them
// to the Auth microservice via TCP.
//
// FLOW:
// 1. Client sends HTTP POST /auth/login
// 2. Gateway receives request, validates DTO
// 3. Gateway sends TCP message to Auth Service
// 4. Auth Service processes request, returns result
// 5. Gateway returns HTTP response to client

import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Inject,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ConflictException,
  InjectionToken,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { firstValueFrom, Observable } from 'rxjs';
import { SERVICE_TOKENS, AUTH_PATTERNS, ServiceResponse } from '@libscontracts';
import { AuthGuard } from '../guards/auth.guard';
import {
  LoginDto,
  SignupDto,
  LoginResponseDto,
  UserProfileDto,
} from '../dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(
      SERVICE_TOKENS.AUTH_SERVICE as unknown as InjectionToken<ClientProxy>,
    )
    private readonly authClient: ClientProxy,
    @InjectPinoLogger(AuthController.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * User Signup
   * POST /auth/signup
   */
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @Post('signup')
  async signup(@Body() signupDto: SignupDto): Promise<{ message: string }> {
    this.logger.info({ email: signupDto.email }, 'Signup request received');

    // Send message to Auth Service
    const observable: Observable<ServiceResponse<void>> = this.authClient.send(
      AUTH_PATTERNS.SIGNUP,
      signupDto as unknown as Record<string, unknown>,
    );
    const response = await firstValueFrom(observable);

    if (!response.success) {
      this.logger.warn(
        { email: signupDto.email, error: response.error },
        'Signup failed',
      );
      throw new ConflictException(response.error?.message || 'Signup failed');
    }

    return { message: 'User registered successfully' };
  }

  /**
   * User Login
   * POST /auth/login
   */
  @ApiOperation({ summary: 'Login and get JWT token' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    this.logger.info({ email: loginDto.email }, 'Login request received');

    // Send message to Auth Service
    const observable: Observable<ServiceResponse<LoginResponseDto>> =
      this.authClient.send(
        AUTH_PATTERNS.LOGIN,
        loginDto as unknown as Record<string, unknown>,
      );
    const response = await firstValueFrom(observable);

    if (!response.success || !response.data) {
      this.logger.warn(
        { email: loginDto.email, error: response.error },
        'Login failed',
      );
      throw new UnauthorizedException(
        response.error?.message || 'Invalid credentials',
      );
    }

    return response.data;
  }

  /**
   * Get Current User Profile
   * GET /auth/profile
   */
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'User profile',
    type: UserProfileDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req: any): UserProfileDto {
    this.logger.info({ userId: req.user.id }, 'Profile request received');

    // User is already attached by AuthGuard
    return {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      organizationId: req.user.organizationId,
    };
  }
}
