import { DataSource } from 'typeorm';
import { User } from '../src/user/entities/user.entity';
import { Role } from '../src/auth/enums/role.enum';
import * as argon2 from 'argon2';

export async function seedTestUsers(dataSource: DataSource): Promise<{
  user: User;
  moderator: User;
  admin: User;
}> {
  const userRepository = dataSource.getRepository(User);

  const hashedUserPassword = await argon2.hash('Password123!');
  const hashedModeratorPassword = await argon2.hash('Password123!');
  const hashedAdminPassword = await argon2.hash('Password123!');

  // Clear existing test users
  await userRepository.delete({
    email: 'testuser@example.com',
  });
  await userRepository.delete({
    email: 'testmoderator@example.com',
  });
  await userRepository.delete({
    email: 'testadmin@example.com',
  });

  const user = userRepository.create({
    email: 'testuser@example.com',
    password: hashedUserPassword,
    name: 'Test User',
    role: Role.USER,
  });

  const moderator = userRepository.create({
    email: 'testmoderator@example.com',
    password: hashedModeratorPassword,
    name: 'Test Moderator',
    role: Role.MODERATOR,
  });

  const admin = userRepository.create({
    email: 'testadmin@example.com',
    password: hashedAdminPassword,
    name: 'Test Admin',
    role: Role.ADMIN,
  });

  await userRepository.save([user, moderator, admin]);

  return { user, moderator, admin };
}
