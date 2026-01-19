// ============================================================================
// AUTH SERVICE - MAIN ENTRY POINT
// ============================================================================
// This is a standalone microservice that handles authentication operations.
// It communicates via TCP transport and receives messages from the API Gateway.
// ============================================================================

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { AuthServiceModule } from './auth-service.module';

async function bootstrap() {
  // Create a microservice application using TCP transport
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.AUTH_SERVICE_HOST || '0.0.0.0',
        port: parseInt(process.env.AUTH_SERVICE_PORT || '3001', 10),
      },
    },
  );

  // Use Pino for structured logging
  app.useLogger(app.get(Logger));

  // Start listening for TCP connections
  await app.listen();

  console.log(
    `🔐 Auth Service is running on TCP port ${process.env.AUTH_SERVICE_PORT || 3001}`,
  );
}

void bootstrap();
