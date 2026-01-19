import { Module, Global } from '@nestjs/common';
import { DomainEventEmitter } from './events/domain-event.emitter';

/**
 * Shared module containing cross-cutting concerns.
 * Marked as @Global so it doesn't need to be imported everywhere.
 */
@Global()
@Module({
  providers: [DomainEventEmitter],
  exports: [DomainEventEmitter],
})
export class SharedModule {}
