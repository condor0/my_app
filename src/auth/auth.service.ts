import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { User } from '../user/entities/user.entity';
import * as argon2 from 'argon2';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
  ) {}

  async signup(signupDto: SignupDto): Promise<void> {
    const { email, password, name } = signupDto;

    this.logger.info({ email }, 'User signup attempt');

    // Check existing
    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) {
      this.logger.warn({ email }, 'Signup failed: email already exists');
      throw new ConflictException('Email already exists');
    }

    // Hash Password with argon2
    const hashedPassword = await argon2.hash(password);

    // Create & Save
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

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    const { email, password } = loginDto;

    this.logger.info({ email }, 'User login attempt');

    const user = await this.usersRepository.findOne({ where: { email } });

    if (user && (await argon2.verify(user.password, password))) {
      // Create Payload (what's inside the token)
      const payload = { email: user.email, sub: user.id, role: user.role };
      const accessToken = this.jwtService.sign(payload);

      this.logger.info(
        { userId: user.id, email, role: user.role },
        'User logged in successfully',
      );

      return { accessToken };
    } else {
      this.logger.warn({ email }, 'Login failed: invalid credentials');
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
