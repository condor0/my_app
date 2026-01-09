import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Import ConfigService
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Controllers
import { HealthController } from './health/health.controller';
import { UsersController } from './user/user.controller';

// Entities
import { User } from './user/entities/user.entity';
import { Organization } from './user/entities/organization.entity';

// Observability Tools
import { LoggingInterceptor } from './common/Interceptors/logging.interceptors';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { HttpExceptionFilter } from './filters/http-exception.filter';

@Module({
  imports: [
    // 1. Configuration
    ConfigModule.forRoot({ isGlobal: true }),

    // 2. Structured Logging
    LoggerModule.forRoot({
      pinoHttp: {
        customProps: () => ({ context: 'HTTP' }),
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),

    // 3. Database Connection (Updated to use .env)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: false, // Enforce migration-only changes
      }),
    }),

    // 4. Feature Modules
    AuthModule,
    EventsModule,
    TypeOrmModule.forFeature([User, Organization]),
  ],
  controllers: [AppController, HealthController, UsersController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    LoggingInterceptor,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
