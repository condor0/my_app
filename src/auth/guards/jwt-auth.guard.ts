import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Just call the parent implementation - it will handle validation
    // The JWT strategy and handleRequest will deal with any auth errors
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: Error | null, user: TUser): TUser {
    // Handle any errors from the JWT strategy
    // Passport calls this with: err, user, info, context
    if (err || !user) {
      throw new UnauthorizedException(
        'Invalid or missing authentication token',
      );
    }
    return user;
  }
}
