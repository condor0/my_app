import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Delete,
  Param,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import {
  LoginResponseDto,
  UserProfileResponseDto,
  MessageResponseDto,
  ErrorResponseDto,
  ForbiddenResponseDto,
} from './dto/response.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';
import { User } from '../user/entities/user.entity';
import { Roles } from './decorators/roles.decorator';
import { Role } from './enums/role.enum';
import { RolesGuard } from './guards/roles.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @InjectPinoLogger(AuthController.name)
    private readonly logger: PinoLogger,
  ) {}

  @ApiOperation({
    summary: 'User signup',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input (validation failed)',
    type: ErrorResponseDto,
  })
  @Post('/signup')
  signup(@Body() signupDto: SignupDto): Promise<void> {
    return this.authService.signup(signupDto);
  }

  @ApiOperation({
    summary: 'User login',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT access token',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input (validation failed)',
    type: ErrorResponseDto,
  })
  @HttpCode(200)
  @Post('/login')
  async login(@Body() loginDto: LoginDto): Promise<{ accessToken: string }> {
    return this.authService.login(loginDto);
  }

  @ApiOperation({
    summary: 'Get current user profile',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Returns authenticated user information',
    type: UserProfileResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized (missing or invalid token)',
    type: ErrorResponseDto,
  })
  @Get('/me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req: ExpressRequest & { user: User }) {
    return req.user;
  }

  @ApiOperation({
    summary: 'Admin only - Delete user',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'id',
    description: 'User ID to delete',
    example: '999',
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully deleted',
    type: MessageResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized (missing or invalid token)',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden (insufficient permissions - requires ADMIN role)',
    type: ForbiddenResponseDto,
  })
  @Delete('/admin/users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  deleteUser(
    @Param('id') id: string,
    @Request() req: ExpressRequest & { user: User },
  ): {
    message: string;
  } {
    return {
      message: `Admin ${req.user.email} can delete user with ID ${id}`,
    };
  }

  @ApiOperation({
    summary: 'Moderator+ only - Manage content',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Content management successful',
    type: MessageResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized (missing or invalid token)',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden (insufficient permissions - requires MODERATOR or ADMIN role)',
    type: ForbiddenResponseDto,
  })
  @HttpCode(200)
  @Post('/moderator/content')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MODERATOR, Role.ADMIN)
  manageContent(@Request() req: ExpressRequest & { user: User }): {
    message: string;
  } {
    return {
      message: `${req.user.role} ${req.user.email} can manage content`,
    };
  }
}
