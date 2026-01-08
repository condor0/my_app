import { Controller, Post, Body, Get } from '@nestjs/common';
import { CreateUserDto } from './create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectPinoLogger(UsersController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Post()
  create(@Body() dto: CreateUserDto): { message: string; data: CreateUserDto } {
    this.logger.info({ email: dto.email }, 'Creating user via POST /users');
    return {
      message: 'User created',
      data: dto,
    };
  }

  @Get()
  async findAll() {
    this.logger.info('Fetching all users');
    const users = await this.userRepo.find({ relations: ['organization'] });
    this.logger.info({ count: users.length }, 'Users fetched successfully');
    return users;
  }
}
