# Day 04: Database Layer, Schema Sync, and Seeds

## Overview

Successfully established the persistence layer using PostgreSQL and TypeORM. Resolved initial table creation errors by implementing a development-friendly synchronization strategy and verified relational data flow between Users and Organizations.

## Technical Decisions

- **Database Environment**: Provisioned a PostgreSQL 15 instance via Docker-Compose.
- **Schema Management**:
  - Implemented a hybrid workflow: `synchronize` is enabled for local development (`process.env.NODE_ENV !== 'production'`) to ensure automatic table creation.
  - Maintained a migration-ready structure for production to prevent data loss.
- **Entity Registration**: Registered `User` and `Organization` entities using `TypeOrmModule.forFeature()` to enable Repository injection in controllers.
- **Data Seeding**: Developed a standalone `seed.ts` script using the shared `DataSource` configuration to populate the database with initial multi-tenant data (Organizations + Users).

## Troubleshooting & Diagnosis

- **Symptom**: `500 Internal Server Error` on `GET /users`.
- **Root Cause**: `QueryFailedError: relation "users" does not exist`. The database was active, but the schema had not been initialized.
- **Resolution**: Updated `typeorm.config.ts` to allow schema synchronization in development and re-ran the seed script.

## Verification (Definition of Done)

- **Readiness Probe**: `/health/ready` validates active DB connectivity.
- **User Endpoint**: `GET /users` successfully returns user data with the `organization` relationship joined.
- **Integrity**: Verified that `Organization` must exist before a `User` can be assigned via Foreign Key constraints.

---

## How to Run (Fresh Setup)

1. **Start Infrastructure**:
   ```bash
   docker-compose up -d
   npm run start:dev
   npm run seed
   ```
