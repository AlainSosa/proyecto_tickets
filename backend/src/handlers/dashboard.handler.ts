import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();
const controller = new DashboardController();

router.get('/', authenticate, controller.getStats.bind(controller));
router.get('/summary', authenticate, controller.getSummary.bind(controller));
router.get('/tickets-by-status', authenticate, controller.getTicketsByStatus.bind(controller));
router.get('/tickets-by-month', authenticate, controller.getTicketsByMonth.bind(controller));
router.get('/tickets-by-category', authenticate, controller.getTicketsByCategory.bind(controller));
router.get('/tickets-by-area', authenticate, controller.getTicketsByArea.bind(controller));
router.get('/tickets-by-priority', authenticate, controller.getTicketsByPriority.bind(controller));
router.get('/technician-metrics', authenticate, controller.getTechnicianMetrics.bind(controller));
router.get('/resolution-trend', authenticate, controller.getResolutionTrend.bind(controller));
router.get('/recent-tickets', authenticate, controller.getRecentTickets.bind(controller));
router.get('/critical-tickets', authenticate, controller.getCriticalTickets.bind(controller));
router.get('/maintenance-assets', authenticate, controller.getMaintenanceAssets.bind(controller));
router.get('/inactive-network-points', authenticate, controller.getInactiveNetworkPoints.bind(controller));
router.get('/predictive-analysis', authenticate, controller.getPredictiveAnalysis.bind(controller));

export default router;
