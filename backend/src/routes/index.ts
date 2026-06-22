import { Router } from 'express';
import authHandler from '../handlers/auth.handler';
import ticketHandler from '../handlers/ticket.handler';
import assetHandler from '../handlers/asset.handler';
import networkPointHandler from '../handlers/network-point.handler';
import extensionHandler from '../handlers/extension.handler';
import maintenanceHandler from '../handlers/maintenance.handler';
import userHandler from '../handlers/user.handler';
import dashboardHandler from '../handlers/dashboard.handler';

const router = Router();

router.use('/auth', authHandler);
router.use('/tickets', ticketHandler);
router.use('/assets', assetHandler);
router.use('/network-points', networkPointHandler);
router.use('/extensions', extensionHandler);
router.use('/maintenance', maintenanceHandler);
router.use('/users', userHandler);
router.use('/dashboard', dashboardHandler);

export default router;
