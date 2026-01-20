// ============================================================================
// AUTH MICROSERVICE CONTROLLER
// ============================================================================
// This controller handles incoming TCP messages from the API Gateway.
// It manages authentication operations: login, signup, token validation.
// KEY CONCEPTS:
// - @MessagePattern: Defines the pattern/route this handler responds to
// - @Payload: Extracts the message payload
// - JWT tokens are created here and validated when needed
// ============================================================================

import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { AuthService } from './auth.service';
import {
  AUTH_PATTERNS,
  LoginRequestDto,
  LoginResponseDto,
  SignupRequestDto,
  ValidateTokenRequestDto,
  ValidateTokenResponseDto,
  GetUserProfileRequestDto,
  UserDto,
  ServiceResponse,
} from '@libscontracts';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectPinoLogger(AuthController.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * LOGIN
   * Pattern: 'auth.login'
   *
   * Validates credentials and returns JWT access token.
   */
  @MessagePattern(AUTH_PATTERNS.LOGIN)
  async login(
    @Payload() data: LoginRequestDto,
  ): Promise<ServiceResponse<LoginResponseDto>> {
    this.logger.info(
      { pattern: AUTH_PATTERNS.LOGIN, email: data.email },
      'Login attempt',
    );

    try {
      const result = await this.authService.login(data);
      return ServiceResponse.ok(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const errorMessage: string = error.message;
      this.logger.warn(
        { email: data.email, error: errorMessage } as Record<string, unknown>,
        'Login failed',
      );
      return ServiceResponse.fail({
        code: 'INVALID_CREDENTIALS',
        message: error.message,
      });
    }
  }

  /**
   * SIGNUP
   * Pattern: 'auth.signup'
   *
   * Creates a new user account.
   */
  @MessagePattern(AUTH_PATTERNS.SIGNUP)
  async signup(
    @Payload() data: SignupRequestDto,
  ): Promise<ServiceResponse<void>> {
    this.logger.info(
      { pattern: AUTH_PATTERNS.SIGNUP, email: data.email },
      'Signup attempt',
    );
    try {
      await this.authService.signup(data);
      return ServiceResponse.ok(undefined);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const errorMessage: string = error.message;
      this.logger.warn(
        { email: data.email, error: errorMessage } as Record<string, unknown>,
        'Signup failed',
      );
      return ServiceResponse.fail({
        code: 'SIGNUP_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * VALIDATE TOKEN
   * Pattern: 'auth.validate_token'
   * Validates a JWT token and returns user information.
   * Used by the gateway to authenticate requests.
   */
  @MessagePattern(AUTH_PATTERNS.VALIDATE_TOKEN)
  async validateToken(
    @Payload() data: ValidateTokenRequestDto,
  ): Promise<ServiceResponse<ValidateTokenResponseDto>> {
    this.logger.debug(
      { pattern: AUTH_PATTERNS.VALIDATE_TOKEN },
      'Validating token',
    );

    try {
      const result = await this.authService.validateToken(data.token);
      return ServiceResponse.ok(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const errorMessage: string = error.message;
      this.logger.debug(
        { error: errorMessage } as Record<string, unknown>,
        'Token validation failed',
      );
      return ServiceResponse.ok({ valid: false });
    }
  }

  /**
   * GET USER PROFILE
   * Pattern: 'auth.get_user_profile'
   * Returns user profile information by user ID.
   */
  @MessagePattern(AUTH_PATTERNS.GET_USER_PROFILE)
  async getUserProfile(
    @Payload() data: GetUserProfileRequestDto,
  ): Promise<ServiceResponse<UserDto>> {
    this.logger.info(
      { pattern: AUTH_PATTERNS.GET_USER_PROFILE, userId: data.userId },
      'Getting user profile',
    );

    try {
      const user = await this.authService.getUserById(data.userId);
      return ServiceResponse.ok(user);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const errorMessage: string = error.message;
      const userId: number = data.userId;
      this.logger.warn(
        { userId, error: errorMessage } as Record<string, unknown>,
        'Get user profile failed',
      );
      return ServiceResponse.fail({
        code: 'USER_NOT_FOUND',
        message: error.message,
      });
    }
  }
}
