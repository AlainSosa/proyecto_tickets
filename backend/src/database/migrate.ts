import { sequelize } from './connection';
import { ensureDatabaseExists } from './ensureDatabase';
import { setupAssociations } from './models/associations';
import '../database/models';

setupAssociations();

async function migrate(): Promise<void> {
  try {
    console.log('Running migrations...');
    await ensureDatabaseExists();
    await sequelize.sync({ force: false, alter: true });
    console.log('Migrations completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
