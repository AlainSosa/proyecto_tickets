import { Sequelize } from 'sequelize';
import { config } from '../config';

export const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'postgres',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      paranoid: true,
    },
  }
);

export async function testConnection(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');
  } catch (error) {
    console.error('Unable to connect to database:', error);
    throw error;
  }
}
