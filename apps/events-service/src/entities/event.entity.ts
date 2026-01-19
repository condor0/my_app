// ============================================================================
// EVENT ENTITY (Microservice Version)
// ============================================================================
// This is a copy of the Event entity for the events microservice.
// In a production setup, you might share entities via a library or generate them.
// ============================================================================

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EventStatus } from './event-status.enum';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column()
  location: string;

  @Column({ type: 'enum', enum: EventStatus, default: EventStatus.DRAFT })
  status: EventStatus;

  @Column({ nullable: true })
  rejectReason?: string;

  @Column()
  organizationId: number;

  @Column()
  ownerId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
