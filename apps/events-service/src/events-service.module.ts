// ============================================================================
// EVENTS SERVICE MODULE
// ============================================================================
// This module configures the Events microservice with:
// - Database connection (TypeORM)
// - Configuration management
// - Structured logging
// ============================================================================

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Event } from './entities/event.entity';

@Module({
  imports: [
    // Configuration from environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),

    // Structured logging
    LoggerModule.forRoot({
      pinoHttp: {
        customProps: () => ({ service: 'events-service' }),
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),

    // Database connection
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'user'),
        password: configService.get<string>('DB_PASSWORD', 'password'),
        database: configService.get<string>('DB_DATABASE', 'myapp'),
        entities: [Event],
        synchronize: false, // Use migrations in production
      }),
    }),

    // Register Event entity
    TypeOrmModule.forFeature([Event]),
  ],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsServiceModule {}
