import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

@Injectable()
export class AppService {
  constructor(
    @InjectPinoLogger(AppService.name)
    private readonly logger: PinoLogger,
  ) {}

  getHello(): string {
    this.logger.info('Hello endpoint called');
    return 'Hello World!';
  }
}
