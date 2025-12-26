import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { UsersController } from './user/user.controller';


@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [HealthController, UsersController],
})
export class AppModule {}
