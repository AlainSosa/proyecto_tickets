import { sequelize } from './connection';
import bcrypt from 'bcryptjs';
import { ensureDatabaseExists } from './ensureDatabase';
import { setupAssociations } from './models/associations';
import { User } from './models/User';

setupAssociations();

async function seed(): Promise<void> {
  try {
    console.log('Running seeders...');
    await ensureDatabaseExists();

    const passwordHash = await bcrypt.hash('admin123', 10);

    await User.findOrCreate({
      where: { email: 'admin@sistema.com' },
      defaults: {
        name: 'Administrador',
        email: 'admin@sistema.com',
        password: passwordHash,
        role: 'admin',
        area: 'Administración',
        isActive: true,
      },
    });

    await User.findOrCreate({
      where: { email: 'tecnico@sistema.com' },
      defaults: {
        name: 'Técnico',
        email: 'tecnico@sistema.com',
        password: await bcrypt.hash('tecnico123', 10),
        role: 'technician',
        area: 'CCOM',
        isActive: true,
      },
    });

    await User.findOrCreate({
      where: { email: 'usuario@sistema.com' },
      defaults: {
        name: 'Usuario Final',
        email: 'usuario@sistema.com',
        password: await bcrypt.hash('usuario123', 10),
        role: 'user',
        area: 'Consulado',
        isActive: true,
      },
    });

    console.log('Seeders completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
