import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity'; // Adjust path to your user entity
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
jest.mock('bcrypt');
describe('AuthService', () => {
  let service: AuthService;
  
  // 1. Create a Mock Repository
  const mockUserRepository = {
    create: jest.fn().mockImplementation(dto => dto),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(() => 'test_token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User), // This mocks @InjectRepository(User)
          useValue: mockUserRepository,
        },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return a token if password matches', async () => {
  const fakeUser = { email: 'test@test.com', password: 'hashed_password' };
  mockUserRepository.findOne.mockResolvedValue(fakeUser);
  
  // Use this instead of spyOn:
  (bcrypt.compare as jest.Mock).mockResolvedValue(true);

  const result = await service.login({
      email: 'test@test.com',
      password: 'password123'
  });
  
  expect(result).toEqual({ accessToken: 'test_token' });
});

    it('should throw UnauthorizedException if password fails', async () => {
  mockUserRepository.findOne.mockResolvedValue({ password: 'hashed' });
  
  // Use this instead of spyOn:
  (bcrypt.compare as jest.Mock).mockResolvedValue(false);

  await expect(service.login({
      email: 'test@test.com',
      password: 'wrong_pass'
  })).rejects.toThrow(UnauthorizedException);
    });
  });
});