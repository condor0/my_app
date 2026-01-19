// AUTH GUARD (Gateway)
// This guard validates JWT tokens by calling the Auth Service.
// It attaches the user object to the request for downstream use.
//
// KEY CONCEPT:
// Unlike the monolith where JWT validation happens locally, in microservices
// the gateway delegates authentication to the Auth Service. This centralizes
// auth logic and allows for more sophisticated token management.
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  InjectionToken,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  SERVICE_TOKENS,
  AUTH_PATTERNS,
  ServiceResponse,
  ValidateTokenResponseDto,
} from '@libscontracts';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(SERVICE_TOKENS.AUTH_SERVICE as InjectionToken)
    private readonly authClient: ClientProxy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No authorization header');
    }

    // Extract token from "Bearer <token>"
    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    try {
      // Validate token with Auth Service
      const observable: Observable<ServiceResponse<ValidateTokenResponseDto>> =
        this.authClient.send(AUTH_PATTERNS.VALIDATE_TOKEN, { token } as Record<
          string,
          unknown
        >);
      const response = await firstValueFrom(observable);

      if (!response.success || !response.data?.valid || !response.data?.user) {
        throw new UnauthorizedException('Invalid token');
      }

      // Attach user to request for use in controllers
      request.user = response.data.user;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
