import { sequelize } from './connection';
import { setupAssociations } from './models/associations';
import '../database/models';

setupAssociations();

async function migrate(): Promise<void> {
  try {
    console.log('Running migrations...');
    await sequelize.sync({ force: false, alter: true });
    console.log('Migrations completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
