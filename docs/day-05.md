Day 05: Authentication, Security, and Unit Testing
Overview
Successfully implemented a secure authentication layer using Passport.js and JWT with Argon2 password hashing. Established a persistent user lifecycle (Signup -> Login -> Session) and validated the logic through comprehensive unit tests.

Technical Decisions
Security Protocol:

Password Hashing: Integrated argon2 for cryptographic password hashing, providing superior security compared to bcrypt with configurable memory and time costs.

Stateless Auth: Utilized JSON Web Tokens (JWT) for session management, signed with a configurable JWT_SECRET environment variable.

Token Configuration: Implemented configurable JWT expiration via JWT_EXPIRATION env variable (defaults to '1h').

Strategy Implementation:

Passport Strategy: Configured JwtStrategy to extract and validate tokens from the Authorization: Bearer header.

Modular Design: Exported JwtStrategy and PassportModule from AuthModule for reusability across the application.

Guards: Deployed JwtAuthGuard as a modular decorator to protect sensitive routes like /auth/me.

Testing Methodology:

Isolated Unit Tests: Focused on AuthService logic by mocking TypeORM Repository and Argon2 library to ensure tests run independently without requiring a live database.

Mocking Strategy: 
- Used getRepositoryToken() to inject mock repositories
- Used jest.mock('argon2') to handle external library mocking
- Created plain Jest mock objects to avoid @typescript-eslint/unbound-method errors

Test Coverage:

Signup Tests:
  - Successfully creates new users with hashed passwords
  - Throws ConflictException for duplicate emails
  
Login Tests:
  - Returns accessToken with valid credentials
  - Throws UnauthorizedException for non-existent users
  - Throws UnauthorizedException for incorrect passwords

Implementation Details:

AuthService Methods:
- signup(signupDto): Validates email uniqueness, hashes password with argon2, creates and saves user
- login(loginDto): Verifies user exists, validates password using argon2.verify(), generates JWT token with email and user ID as payload

AuthModule Configuration:
- TypeOrmModule.forFeature([User]): Registers User entity for dependency injection
- JwtModule.registerAsync(): Dynamically configures JWT with environment variables
- PassportModule.register(): Sets default strategy to 'jwt'
- Exports: JwtStrategy and PassportModule for use in other modules
