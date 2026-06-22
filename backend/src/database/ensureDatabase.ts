import { QueryTypes, Sequelize } from 'sequelize';
import { config } from '../config';

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export async function ensureDatabaseExists(): Promise<void> {
  const adminConnection = new Sequelize('postgres', config.db.user, config.db.password, {
    host: config.db.host,
    port: config.db.port,
    dialect: 'postgres',
    logging: false,
  });

  try {
    const databases = await adminConnection.query<{ datname: string }>(
      'SELECT datname FROM pg_database WHERE datname = :databaseName',
      {
        replacements: { databaseName: config.db.name },
        type: QueryTypes.SELECT,
      }
    );

    if (databases.length === 0) {
      await adminConnection.query(`CREATE DATABASE ${quoteIdentifier(config.db.name)}`);
      console.log(`Database "${config.db.name}" created.`);
    }
  } finally {
    await adminConnection.close();
  }
}
