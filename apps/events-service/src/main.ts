// ============================================================================
// EVENTS SERVICE - MAIN ENTRY POINT
// ============================================================================
// This is a standalone microservice that handles all event-related operations.
// It communicates via TCP transport and receives messages from the API Gateway.
// ============================================================================

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { EventsServiceModule } from './events-service.module';

async function bootstrap() {
  // Create a microservice application (not HTTP!)
  // This uses TCP transport for communication
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    EventsServiceModule,
    {
      // TCP Transport Configuration
      transport: Transport.TCP,
      options: {
        host: process.env.EVENTS_SERVICE_HOST || '0.0.0.0',
        port: parseInt(process.env.EVENTS_SERVICE_PORT || '3002', 10),
      },
    },
  );

  // Use Pino for structured logging
  app.useLogger(app.get(Logger));

  // Start listening for TCP connections
  await app.listen();

  console.log(
    `🎯 Events Service is running on TCP port ${process.env.EVENTS_SERVICE_PORT || 3002}`,
  );
}

void bootstrap();
