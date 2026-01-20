import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import type { User } from './user.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  // An organization can have many users
  // Use string reference to avoid circular import
  @OneToMany('User', 'organization')
  users?: User[];
}
