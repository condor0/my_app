import dataSource from '../../config/typeorm.config';
import { User } from '../../user/entities/user.entity';
import { Organization } from '../../user/entities/organization.entity';

async function seed() {
  console.log(' Starting database seeding...');
  
  try {
    // 1. Initialize the connection using your existing DataSource config
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    
    const orgRepo = dataSource.getRepository(Organization);
    const userRepo = dataSource.getRepository(User);

    // 2. Create the Organization
    // We use findOneBy to prevent creating duplicates if you run the seed twice
    let org = await orgRepo.findOneBy({ name: 'Default Org' });
    if (!org) {
      org = await orgRepo.save({ name: 'Default Org' });
      console.log(' Created Organization: Default Org');
    }

    // 3. Create Seed Users
    const seedUsers = [
      { name: 'Admin User', email: 'admin@example.com', organization: org },
      { name: 'Dev User', email: 'dev@example.com', organization: org }
    ];

    for (const userData of seedUsers) {
      const exists = await userRepo.findOneBy({ email: userData.email });
      if (!exists) {
        await userRepo.save(userData);
        console.log(` Created User: ${userData.email}`);
      }
    }

    console.log(' Seeding complete!');
  } catch (error) {
    console.error(' Seeding failed:', error);
  } finally {
    // 4. Close the connection so the terminal process actually exits
    await dataSource.destroy();
  }
}

seed();