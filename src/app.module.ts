import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';

// Controllers
import { HealthController } from './health/health.controller';
import { UsersController } from './user/user.controller';

// Entities
import { User } from './user/entities/user.entity';
import { Organization } from './user/entities/organization.entity';

// Observability Tools
import { LoggingInterceptor } from './common/Interceptors/logging.interceptors';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

@Module({
  imports: [
    // 1. Configuration (Only need this once)
    ConfigModule.forRoot({ isGlobal: true }),

    // 2. Structured Logging (Pino)
    LoggerModule.forRoot({
      pinoHttp: {
        customProps: () => ({
          context: 'HTTP',
        }),
        transport: process.env.NODE_ENV !== 'production' 
          ? { target: 'pino-pretty', options: { colorize: true } } 
          : undefined,
      },
    }),

    // 3. Database Connection
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'user',
      password: 'password',
      database: 'myapp',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
    }),

    // 4. Feature Entities
    TypeOrmModule.forFeature([User, Organization]),
  ],
  controllers: [HealthController, UsersController],
  providers: [
    // 5. Global Interceptor (Fixes the "Expected 1 arguments" error)
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  // 6. Register Correlation ID Middleware for all routes
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes('*');
  }
}