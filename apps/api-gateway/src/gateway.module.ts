// API GATEWAY MODULE
// This module configures the API Gateway with:
// - Microservice client connections (TCP)
// - HTTP controllers for routing
// - Authentication guards
// - Swagger documentation

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LoggerModule } from 'nestjs-pino';
import { SERVICE_TOKENS } from '@libscontracts';
import { AuthController } from './controllers/auth.controller';
import { EventsController } from './controllers/events.controller';
import { HealthController } from './controllers/health.controller';
import { AuthGuard } from './guards/auth.guard';

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
        customProps: () => ({ service: 'api-gateway' }),
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),

    // MICROSERVICE CLIENTS
    // These are TCP clients that connect to the microservices.
    // The gateway uses these to send messages to the services.
    ClientsModule.registerAsync([
      // Auth Service Client
      {
        name: SERVICE_TOKENS.AUTH_SERVICE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('AUTH_SERVICE_HOST', 'localhost'),
            port: configService.get<number>('AUTH_SERVICE_PORT', 3001),
          },
        }),
      },
      // Events Service Client
      {
        name: SERVICE_TOKENS.EVENTS_SERVICE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('EVENTS_SERVICE_HOST', 'localhost'),
            port: configService.get<number>('EVENTS_SERVICE_PORT', 3002),
          },
        }),
      },
    ]),
  ],
  controllers: [AuthController, EventsController, HealthController],
  providers: [AuthGuard],
  exports: [AuthGuard],
})
export class GatewayModule {}
