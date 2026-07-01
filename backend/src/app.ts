import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { sequelize, testConnection } from './database/connection';
import { setupAssociations } from './database/models/associations';
import { errorHandler } from './middlewares/errorHandler';
import routes from './routes';
import dashboardHandler from './handlers/dashboard.handler';
import { normalizeInstitutionalAreas } from './database/normalizeInstitutionalAreas';
import { normalizeTicketStatuses } from './database/normalizeTicketStatuses';

const app = express();

setupAssociations();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.use('/api/v1', routes);
app.use('/api/dashboard', dashboardHandler);

app.use(errorHandler);

async function start(): Promise<void> {
  try {
    await testConnection();
    await sequelize.sync({ alter: true });
    await normalizeInstitutionalAreas();
    await normalizeTicketStatuses();
    console.log('Database synchronized.');

    app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
