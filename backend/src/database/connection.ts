import { Sequelize } from 'sequelize';
import { config } from '../config';

const sharedOptions = {
  dialect: 'postgres' as const,
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
    paranoid: true,
  },
};

const sslOptions =
  config.db.ssl || (config.db.url && config.nodeEnv === 'production')
    ? {
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        },
      }
    : {};

export const sequelize = config.db.url
  ? new Sequelize(config.db.url, {
      ...sharedOptions,
      ...sslOptions,
    })
  : new Sequelize(config.db.name, config.db.user, config.db.password, {
      ...sharedOptions,
      host: config.db.host,
      port: config.db.port,
      ...sslOptions,
    });

export async function testConnection(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');
  } catch (error) {
    console.error('Unable to connect to database:', error);
    throw error;
  }
}
