import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './common/Interceptors/logging.interceptors';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
      skipMissingProperties: false,
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Logging Interceptor
  const loggingInterceptor = app.get(LoggingInterceptor);
  app.useGlobalInterceptors(loggingInterceptor);

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('NestJS RBAC API')
    .setDescription(
      'API with Role-Based Access Control (RBAC)\n\n' +
        '**Roles:**\n' +
        '- USER: Basic user with minimal permissions\n' +
        '- MODERATOR: Can manage content and user activities\n' +
        '- ADMIN: Full system access\n\n' +
        '**Testing Flow:**\n' +
        '1. Signup a new user\n' +
        '2. Login to get an access token\n' +
        '3. Click "Authorize" button and enter: Bearer <your-token>\n' +
        '4. Test protected endpoints\n' +
        '5. To test moderator/admin routes, manually update user role in database',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication and authorization endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
