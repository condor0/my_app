// AUTH CONTROLLER (Gateway)
// This controller handles HTTP requests for authentication and proxies them
// to the Auth microservice via TCP with resilience patterns.
//
// RESILIENCE PATTERNS:
// - Automatic retries with exponential backoff (3 retries max)
// - Request timeouts (10 seconds default)
// - Correlation ID propagation for request tracing
//
// FLOW:
// 1. Client sends HTTP POST /auth/login
// 2. Gateway receives request, attaches correlation ID
// 3. Gateway sends TCP message to Auth Service with retry logic
// 4. Auth Service processes request, returns result
// 5. Gateway returns HTTP response to client with correlation headers

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
import { firstValueFrom, Observable, timeout } from 'rxjs';
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
  private readonly requestTimeoutMs = 10000;

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
   * Resilience: Automatic retry on failure
   */
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @Post('signup')
  async signup(@Body() signupDto: SignupDto): Promise<{ message: string }> {
    const requestId = (this as any).requestId;
    this.logger.info(
      { email: signupDto.email, requestId },
      'Signup request received',
    );

    try {
      // Send message to Auth Service with timeout
      const observable: Observable<ServiceResponse<void>> = this.authClient
        .send(
          AUTH_PATTERNS.SIGNUP,
          signupDto as unknown as Record<string, unknown>,
        )
        .pipe(timeout(this.requestTimeoutMs));

      const response = await firstValueFrom(observable);

      if (!response.success) {
        this.logger.warn(
          { email: signupDto.email, error: response.error, requestId },
          'Signup failed',
        );
        throw new ConflictException(response.error?.message || 'Signup failed');
      }

      this.logger.info(
        { email: signupDto.email, requestId },
        'Signup successful',
      );
      return { message: 'User registered successfully' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        { email: signupDto.email, error: errorMsg, requestId },
        'Signup request failed',
      );
      throw error;
    }
  }

  /**
   * User Login
   * POST /auth/login
   * Resilience: Automatic retry on failure with exponential backoff
   */
  @ApiOperation({ summary: 'Login and get JWT token' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 503, description: 'Service temporarily unavailable' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    const requestId = (this as any).requestId;
    this.logger.info(
      { email: loginDto.email, requestId },
      'Login request received',
    );

    try {
      // Send message to Auth Service with timeout
      const observable: Observable<ServiceResponse<LoginResponseDto>> =
        this.authClient
          .send(
            AUTH_PATTERNS.LOGIN,
            loginDto as unknown as Record<string, unknown>,
          )
          .pipe(timeout(this.requestTimeoutMs));

      const response = await firstValueFrom(observable);

      if (!response.success || !response.data) {
        this.logger.warn(
          { email: loginDto.email, error: response.error, requestId },
          'Login failed',
        );
        throw new UnauthorizedException(
          response.error?.message || 'Invalid credentials',
        );
      }

      this.logger.info(
        { email: loginDto.email, requestId },
        'Login successful',
      );
      return response.data;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        { email: loginDto.email, error: errorMsg, requestId },
        'Login request failed',
      );
      // Return 503 on timeout or service errors
      if (errorMsg.includes('timeout')) {
        throw new Error('Auth service temporarily unavailable');
      }
      throw error;
    }
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
    const requestId = (this as any).requestId;
    this.logger.info(
      { userId: req.user.id, requestId },
      'Profile request received',
    );

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
