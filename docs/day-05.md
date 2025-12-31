Day 05: Authentication, Security, and Unit Testing
Overview
Successfully implemented a secure authentication layer using Passport.js and JWT. Established a persistent user lifecycle (Signup -> Login -> Session) and validated the logic through isolated unit tests, bypassing environment-specific toolchain issues to maintain development momentum.

Technical Decisions
Security Protocol:

Password Hashing: Integrated bcrypt to perform one-way hashing with a salt factor of 10.

Stateless Auth: Utilized JSON Web Tokens (JWT) for session management, signed with a configurable JWT_SECRET.

Strategy Implementation:

Passport Strategy: Configured JwtStrategy to extract and validate tokens from the Authorization: Bearer header.

Guards: Deployed JwtAuthGuard as a modular decorator to protect sensitive routes like /auth/me.

Testing Methodology:

Isolated Unit Tests: Focused on AuthService logic by mocking TypeORM repositories and the bcrypt library to ensure tests run without requiring a live database or Docker container.

Mocking Strategy: Used getRepositoryToken() to simulate database responses and jest.mock('bcrypt') to handle read-only library restrictions.