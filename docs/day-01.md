# Day 01: Project Setup

## Build Steps Completed

- **NestJS Initialization**: Created app with strict TypeScript and ESLint/Prettier.
- **Configuration**: Integrated `ConfigModule` for environment management.
- **Health Check**: Implemented `/health` endpoint returning 200 OK.
- **Project Structure**: Organized into `modules/` and `common/` directories.

## Running the Project

1. Install dependencies: `npm install`
2. Start in dev mode: `npm run start:dev`
3. Verify Health: `curl http://localhost:3000/health`

## Scripts

- `npm run lint`: Run ESLint to check for code quality.
- `npm run format`: Run Prettier to fix code formatting.
