import { Controller, Post, Body } from '@nestjs/common';
import { CreateUserDto } from './create-user.dto';

@Controller('users')
export class UsersController {

  @Post()
  create(@Body() dto: CreateUserDto) {
    return {
      message: 'User created',
      data: dto,
    };
  }
}
