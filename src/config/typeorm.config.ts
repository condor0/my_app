import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../user/entities/user.entity';
import { Organization } from '../user/entities/organization.entity';

// Load .env file manually for the CLI
config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'myapp',
  // 1. Register entities here
  entities: [User, Organization],
  // 2. STOP AUTO-SYNC: Enforce migration-only changes
  synchronize: false,
  // 3. Define where migrations live
  migrations: ['src/database/migrations/*.ts'],
  // Optional: Custom table name to track migrations
  migrationsTableName: 'migrations_history',
});
