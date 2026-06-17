import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();
const controller = new DashboardController();

router.get('/', authenticate, controller.getStats.bind(controller));

export default router;
