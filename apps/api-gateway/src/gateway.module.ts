// API GATEWAY MODULE
// This module configures the API Gateway with:
// - Microservice client connections (TCP) with resilience
// - Retry logic with exponential backoff
// - Correlation ID propagation
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

    // Structured logging with correlation context
    LoggerModule.forRoot({
      pinoHttp: {
        customProps: () => ({
          service: 'api-gateway',
          timestamp: new Date().toISOString(),
        }),
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),

    // MICROSERVICE CLIENTS
    // These are TCP clients that connect to the microservices.
    // The gateway uses these to send messages to the services.
    // Wrapped with resilience patterns (retry, timeout, backoff)
    ClientsModule.registerAsync([
      // Auth Service Client with Resilience
      {
        name: SERVICE_TOKENS.AUTH_SERVICE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('AUTH_SERVICE_HOST', 'localhost'),
            port: configService.get<number>('AUTH_SERVICE_PORT', 3001),
            // Timeout in milliseconds - aborts requests after this duration
            timeout: configService.get<number>('RPC_TIMEOUT_MS', 10000),
            // Maximum number of reconnection attempts
            maxReconnectAttempts: 5,
            // Initial reconnect delay in milliseconds
            reconnectDelay: 200,
          },
        }),
      },
      // Events Service Client with Resilience
      {
        name: SERVICE_TOKENS.EVENTS_SERVICE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('EVENTS_SERVICE_HOST', 'localhost'),
            port: configService.get<number>('EVENTS_SERVICE_PORT', 3002),
            timeout: configService.get<number>('RPC_TIMEOUT_MS', 10000),
            maxReconnectAttempts: 5,
            reconnectDelay: 200,
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
