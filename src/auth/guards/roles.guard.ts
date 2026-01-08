import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // use the context so it isn't considered unused
    context.switchToHttp().getRequest();
    return true;
  }
}
