import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request as ExpressRequest } from 'express';
import { User } from '../user/entities/user.entity';
import { Roles } from './decorators/roles.decorator';
import { Role } from './enums/role.enum';
import { RolesGuard } from './guards/roles.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'User signup' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input (validation failed)',
  })
  @Post('/signup')
  signup(@Body() signupDto: SignupDto): Promise<void> {
    return this.authService.signup(signupDto);
  }

  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT access token',
    schema: {
      example: { accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input (validation failed)',
  })
  @Post('/login')
  async login(@Body() loginDto: LoginDto): Promise<{ accessToken: string }> {
    return this.authService.login(loginDto);
  }

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Returns authenticated user information',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized (missing or invalid token)',
  })
  @Get('/me')
  @UseGuards(AuthGuard())
  getProfile(@Request() req: ExpressRequest & { user: User }) {
    return req.user;
  }

  @ApiOperation({ summary: 'Admin only - delete user' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'User successfully deleted',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized (missing or invalid token)',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (insufficient permissions)',
  })
  @Delete('/admin/users/:id')
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(Role.ADMIN)
  deleteUser(@Request() req: ExpressRequest & { user: User }): {
    message: string;
  } {
    return { message: `Admin ${req.user.email} can delete users` };
  }

  @ApiOperation({ summary: 'Moderator+ only - manage content' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Content management successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized (missing or invalid token)',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (insufficient permissions)',
  })
  @Post('/moderator/content')
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(Role.MODERATOR, Role.ADMIN)
  manageContent(@Request() req: ExpressRequest & { user: User }): {
    message: string;
  } {
    return {
      message: `${req.user.role} ${req.user.email} can manage content`,
    };
  }
}
