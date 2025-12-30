import { Controller, Post, Body, Get } from '@nestjs/common';
import { CreateUserDto } from './create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return {
      message: 'User created',
      data: dto,
    };
  }

  @Get()
  async findAll() {
    return await this.userRepo.find({ relations: ['organization'] });
  }
}
