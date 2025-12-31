import { Body, Controller, Post, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // PUBLIC ROUTES (No Guard)
  @Post('/signup')
  signup(@Body() signupDto: SignupDto): Promise<void> {
    return this.authService.signup(signupDto);
  }

  @Post('/login')
  login(@Body() loginDto: LoginDto): Promise<{ accessToken: string }> {
    return this.authService.login(loginDto);
  }

  // PROTECTED ROUTE (Requires Token)
  @Get('/me')
  @UseGuards(AuthGuard()) 
  getProfile(@Req() req) {
    // req.user is set by JwtStrategy
    // We strip sensitive info before returning
    const { password, ...user } = req.user;
    return user;
  }
}