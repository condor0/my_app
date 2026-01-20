// ============================================================================
// API GATEWAY - MAIN ENTRY POINT
// ============================================================================
// The API Gateway is the single entry point for all client requests.
// It receives HTTP requests, authenticates them, and forwards them to
// the appropriate microservice via TCP transport.
//
// KEY RESPONSIBILITIES:
// 1. HTTP API endpoint for clients
// 2. Authentication/Authorization
// 3. Request routing to microservices
// 4. Response aggregation
// 5. Rate limiting (can be added)
// 6. API documentation (Swagger)
// ============================================================================

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { GatewayModule } from './gateway.module';

async function bootstrap() {
  // Create a standard HTTP application
  const app = await NestFactory.create(GatewayModule, {
    bufferLogs: true,
  });

  // Use Pino for structured logging
  app.useLogger(app.get(Logger));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable CORS for web clients
  app.enableCors();

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Event Management API')
    .setDescription('Microservices-based Event Management API Gateway')
    .setVersion('2.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Events', 'Event management endpoints')
    .addTag('Health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.GATEWAY_PORT || 3000;
  await app.listen(port);

  console.log(`🚀 API Gateway is running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api`);
}

void bootstrap();
