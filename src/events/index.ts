/**
 * Events Module Public API
 *
 * This barrel file exports only what other modules should consume.
 * Internal implementation details are not exported.
 */

// Module
export { EventsModule } from './events.module';

// Service (for programmatic access by other modules)
export { EventsService } from './events.service';

// Entities (for TypeORM relations in other modules)
export { Event } from './entities/event.entity';

// Enums
export { EventStatus } from './enums/event-status.enum';

// DTOs (for external API consumers)
export { CreateEventDto } from './dto/create-event.dto';
export { UpdateEventDto } from './dto/update-event.dto';
export { GetEventsQueryDto } from './dto/get-events-query.dto';
