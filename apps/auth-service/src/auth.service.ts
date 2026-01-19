// AUTH MICROSERVICE SERVICE
// Business logic for authentication operations.
// Handles user registration, login, and token management.

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import * as argon2 from 'argon2';
import { User } from './entities/user.entity';
import {
  LoginRequestDto,
  LoginResponseDto,
  SignupRequestDto,
  ValidateTokenResponseDto,
  UserDto,
} from '@libscontracts';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Register a new user
   */
  async signup(data: SignupRequestDto): Promise<void> {
    const { email, password, name } = data;

    // Check if email already exists
    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) {
      throw new Error('Email already exists');
    }

    // Hash password with argon2
    const hashedPassword = await argon2.hash(password as string);

    // Create and save user
    const user = this.usersRepository.create({
      email,
      name,
      password: hashedPassword,
    });

    await this.usersRepository.save(user);
    this.logger.info(
      { userId: user.id, email },
      'User registered successfully',
    );
  }

  /**
   * Authenticate user and return JWT token
   */
  async login(data: LoginRequestDto): Promise<LoginResponseDto> {
    const { email, password } = data;

    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user || !(await argon2.verify(user.password, password as string))) {
      throw new Error('Invalid credentials');
    }

    // Create JWT payload
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.info(
      { userId: user.id, email, role: user.role },
      'User logged in',
    );

    return {
      accessToken,
      user: this.toUserDto(user),
    };
  }

  /**
   * Validate JWT token and return user info
   */
  async validateToken(token: string): Promise<ValidateTokenResponseDto> {
    try {
      const payload = this.jwtService.verify(token);

      const user = await this.usersRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        return { valid: false };
      }

      return {
        valid: true,
        user: this.toUserDto(user),
      };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: number): Promise<UserDto> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return this.toUserDto(user);
  }

  /**
   * Convert User entity to UserDto
   */
  private toUserDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    };
  }
}
