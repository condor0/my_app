import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    try {
      return super.canActivate(context);
    } catch (error) {
      // Catch any synchronous errors from passport
      throw new UnauthorizedException('Invalid or missing authentication token');
    }
  }

  handleRequest(
    err: Error | null,
    user: unknown,
    info: Error | string | null,
  ) {
    // Handle any errors from the JWT strategy
    // info contains passport-jwt errors like "No auth token" or "jwt malformed"
    if (err || !user) {
      throw new UnauthorizedException(
        'Invalid or missing authentication token',
      );
    }
    return user;
  }
}
